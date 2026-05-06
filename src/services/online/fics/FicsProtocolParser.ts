import type { FicsServerMessage, FicsMessageType, Style12Data, FicsGameRow, FicsSeekRow } from './FicsTypes';

export class FicsProtocolParser {
  private _status: 'idle' | 'active' = 'idle';

  get status(): 'idle' | 'active' {
    return this._status;
  }

  activate(): void { this._status = 'active'; }
  deactivate(): void { this._status = 'idle'; }

  parse(raw: string): FicsServerMessage {
    const type = this.classifyRaw(raw);
    const msg: FicsServerMessage = { timestamp: Date.now(), raw, type };
    if (type === 'game' && raw.startsWith('<12>')) {
      const s12 = this.parseStyle12(raw);
      if (s12) msg.style12 = s12;
    }
    return msg;
  }

  parseStyle12(raw: string): Style12Data | null {
    const parts = raw.split(' ');
    if (parts.length < 31 || parts[0] !== '<12>') return null;
    try {
      return {
        board:          [parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8]],
        turn:           parts[9] === 'W' ? 'white' : 'black',
        enPassantFile:  parseInt(parts[10], 10),
        canCastle:      { wK: parts[11] === '1', wQ: parts[12] === '1', bK: parts[13] === '1', bQ: parts[14] === '1' },
        halfMoveCount:  parseInt(parts[15], 10),
        gameId:         parseInt(parts[16], 10),
        whiteName:      parts[17],
        blackName:      parts[18],
        myRelation:     parseInt(parts[19], 10),
        initialTimeSecs: parseInt(parts[20], 10) * 60,
        incrementSecs:  parseInt(parts[21], 10),
        whiteClock:     parseInt(parts[24], 10),
        blackClock:     parseInt(parts[25], 10),
        moveNumber:     parseInt(parts[26], 10),
        lastMoveSan:    parts[29] ?? 'none'
      };
    } catch {
      return null;
    }
  }

  detectChallenge(raw: string): { fromUser: string; time: number; inc: number; rated: boolean; parsedReliably: boolean } | null {
    // "Challenge: GuestABC (----) GuestXYZ (----) unrated blitz 5 0."
    const m = /challenge:\s+(\w+)\s+\([^)]*\)\s+\w+\s+\([^)]*\)\s+(rated|unrated)\s+\w+\s+(\d+)\s+(\d+)/i.exec(raw);
    if (m) return { fromUser: m[1], time: parseInt(m[3], 10), inc: parseInt(m[4], 10), rated: m[2].toLowerCase() === 'rated', parsedReliably: true };
    // Looser: any "challenge:" line
    const m2 = /challenge:\s+(\w+)/i.exec(raw);
    if (m2) return { fromUser: m2[1], time: 0, inc: 0, rated: false, parsedReliably: false };
    return null;
  }

  detectGameStart(raw: string): { gameId: number; white: string; black: string } | null {
    const m = /\{Game (\d+) \((\w+) vs\. (\w+)\)/i.exec(raw);
    return m ? { gameId: parseInt(m[1], 10), white: m[2], black: m[3] } : null;
  }

  detectGameEnd(raw: string): { gameId: number; result: string } | null {
    const m = /\{Game (\d+) \([^)]+\)[^}]*\}\s*(1-0|0-1|1\/2-1\/2|\*)/i.exec(raw);
    return m ? { gameId: parseInt(m[1], 10), result: m[2] } : null;
  }

  parseGameRow(raw: string): FicsGameRow | null {
    const cleaned = raw.replace(/^fics%\s*/i, '').trim();

    // Current FICS games list format:
    // "31 1857 scalaQueen 1696 Mundt [ sr 15 0] 10:08 - 5:21 (23-22) W: 25"
    // "32 1836 possibilita 1725 nluetic [ br 3 0] 2:12 - 2:27 (32-35) W: 13"
    const current = /^\s*(\d+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+\[\s*([a-z]+)\s+(\d+)\s+(\d+)\s*\]/i.exec(cleaned);
    if (current) {
      const variantCode = current[6].toLowerCase();
      return {
        gameId: parseInt(current[1], 10),
        whiteRating: current[2],
        white: current[3],
        blackRating: current[4],
        black: current[5],
        timeMinutes: parseInt(current[7], 10),
        incrementSeconds: parseInt(current[8], 10),
        rated: variantCode.length >= 2 && variantCode[1] === 'r',
        variant: variantCode,
        rawLine: raw,
        parsedReliably: true
      };
    }

    // Older/alternate FICS games format retained for compatibility:
    // "42 ( 867 GuestABC 867 GuestXYZ) [ bu 5 0] B: 21 ..."
    const bracketed = /^\s*(\d+)\s+\(\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*\)\s*\[\s*([a-z]+)\s+(\d+)\s+(\d+)\s*\]/i.exec(cleaned);
    if (bracketed) {
      const variantCode = bracketed[6].toLowerCase();
      return {
        gameId: parseInt(bracketed[1], 10),
        whiteRating: bracketed[2],
        white: bracketed[3],
        blackRating: bracketed[4],
        black: bracketed[5],
        timeMinutes: parseInt(bracketed[7], 10),
        incrementSeconds: parseInt(bracketed[8], 10),
        rated: variantCode.length >= 2 && variantCode[1] === 'r',
        variant: variantCode,
        rawLine: raw,
        parsedReliably: true
      };
    }

    // Safe fallback: identify game id, two ratings/names, and bracketed time control when possible.
    const loose = /^\s*(\d+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+).*?\[\s*([a-z]+)\s+(\d+)\s+(\d+)\s*\]/i.exec(cleaned);
    if (!loose) return null;
    const variantCode = loose[6].toLowerCase();
    return {
      gameId: parseInt(loose[1], 10),
      whiteRating: loose[2],
      white: loose[3],
      blackRating: loose[4],
      black: loose[5],
      timeMinutes: parseInt(loose[7], 10),
      incrementSeconds: parseInt(loose[8], 10),
      rated: variantCode.length >= 2 && variantCode[1] === 'r',
      variant: variantCode,
      rawLine: raw,
      parsedReliably: false
    };
  }

  parseSoughtRow(raw: string): FicsSeekRow | null {
    const cleaned = raw.replace(/^fics%\s*/i, '').trim();

    // Current FICS sought list format:
    // "4 1764 marquisce(C) 2 12 unrated blitz 0-9999"
    // "11 ++++ GuestHWYQ 5 0 unrated blitz 0-9999 f"
    const list = /^\s*(\d+)\s+([^\s]+)\s+([^\s]+)\s+(\d+)\s+(\d+)\s+(rated|unrated)\s+([^\s]+)(?:\s+\S+)?(?:\s+([fwb]))?\s*$/i.exec(cleaned);
    if (list) {
      const colorToken = (list[8] || '').toLowerCase();
      const color: FicsSeekRow['color'] = colorToken === 'w'
        ? 'white'
        : colorToken === 'b'
          ? 'black'
          : 'auto';
      return {
        seekId: parseInt(list[1], 10),
        rating: list[2],
        player: list[3],
        timeMinutes: parseInt(list[4], 10),
        incrementSeconds: parseInt(list[5], 10),
        rated: list[6].toLowerCase() === 'rated',
        color,
        variant: list[7].toLowerCase(),
        rawLine: raw,
        parsedReliably: true
      };
    }

    // Live FICS seek announcement:
    // "GuestZKDT (++++) seeking 10 0 unrated blitz [white] (\"play 32\" to respond)"
    const announcement = /^\s*([^\s]+)\s+\(([^)]*)\)\s+seeking\s+(\d+)\s+(\d+)\s+(rated|unrated)\s+([^\s]+)(?:\s+\[(white|black)\])?.*?\(\"play\s+(\d+)\"\s+to\s+respond\)/i.exec(cleaned);
    if (announcement) {
      return {
        seekId: parseInt(announcement[8], 10),
        player: announcement[1],
        rating: announcement[2],
        timeMinutes: parseInt(announcement[3], 10),
        incrementSeconds: parseInt(announcement[4], 10),
        rated: announcement[5].toLowerCase() === 'rated',
        color: (announcement[7]?.toLowerCase() as FicsSeekRow['color']) || 'auto',
        variant: announcement[6].toLowerCase(),
        rawLine: raw,
        parsedReliably: true
      };
    }

    // Older/alternate bracket format retained for compatibility:
    // "1 GuestAABC ++++ [ bu 5 0] m=0 f=0"
    const bracket = /^\s*(\d+)\s+([^\s]+)\s+([^\s]+)\s+\[\s*([a-z]+)\s+(\d+)\s+(\d+)\s*\]/i.exec(cleaned);
    if (bracket) {
      const variant = bracket[4].toLowerCase();
      const colorM = /color=([WB])/i.exec(cleaned);
      const color: FicsSeekRow['color'] = colorM
        ? (colorM[1].toUpperCase() === 'W' ? 'white' : 'black')
        : 'auto';
      return {
        seekId: parseInt(bracket[1], 10),
        player: bracket[2],
        rating: bracket[3],
        timeMinutes: parseInt(bracket[5], 10),
        incrementSeconds: parseInt(bracket[6], 10),
        rated: variant.length >= 2 && variant[1] === 'r',
        color,
        variant,
        rawLine: raw,
        parsedReliably: true
      };
    }

    // Safe fallback: capture id/player/rating and first visible time+increment pair.
    const loose = /^\s*(\d+)\s+([^\s]+)\s+([^\s]+).*?\b(\d+)\s+(\d+)\b/i.exec(cleaned);
    if (!loose) return null;
    return {
      seekId: parseInt(loose[1], 10),
      player: loose[3],
      rating: loose[2],
      timeMinutes: parseInt(loose[4], 10),
      incrementSeconds: parseInt(loose[5], 10),
      rated: /\brated\b/i.test(cleaned) && !/\bunrated\b/i.test(cleaned),
      color: /\[white\]|\s+w\s*$/i.test(cleaned) ? 'white' : /\[black\]|\s+b\s*$/i.test(cleaned) ? 'black' : 'auto',
      variant: (/\b(lightning|blitz|standard|wild|bughouse)\b/i.exec(cleaned)?.[1] || 'unknown').toLowerCase(),
      rawLine: raw,
      parsedReliably: false
    };
  }

  isGamesListEnd(raw: string): boolean {
    return /\d+\s+games?\s+displayed|\d+\s+games?\s+matched|Game\s+\(W/i.test(raw);
  }

  isSoughtListEnd(raw: string): boolean {
    return /\d+\s+seeks?\s+displayed|\d+\s+ads?\s+displayed|No\s+ads?\s+displayed/i.test(raw);
  }

  isGamesEmpty(raw: string): boolean {
    return /no games?\s+in\s+progress/i.test(raw);
  }

  isSoughtEmpty(raw: string): boolean {
    return /nobody is seeking|no seeks?/i.test(raw);
  }

  private classifyRaw(raw: string): FicsMessageType {
    if (raw.startsWith('<12>')) return 'game';
    const lower = raw.toLowerCase();
    if (/login:|password:|starting fics session|press return to enter|invalid password|login incorrect/.test(lower)) return 'login';
    if (/\{game \d+/.test(lower)) return 'game';
    if (/^challenge:/.test(lower)) return 'challenge';
    if (/<s>|<sr>/.test(raw) || /\bseeks?\b.*\d+\s+\d+/.test(lower)) return 'seek';
    if (/\btell\b|\bsays:\b|\bshouts:\b|\bkibitz\b|\bwhisper\b/.test(lower)) return 'chat';
    if (/\berror\b|\billegal move\b|\bnot your\b/.test(lower)) return 'error';
    if (/^\s*\*{3,}|chess server|freechess\.org/.test(lower)) return 'system';
    return 'unknown';
  }
}
