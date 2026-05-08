import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { type LayerConfig } from '../templates';

const BACKGROUND_MAX_SIZE = 20 * 1024 * 1024;
const GALLERY_PAGE_SIZE = 4;

type BackgroundCategory = NonNullable<LayerConfig['category']>;

type BundledBackground = {
  id: string;
  label: string;
  url: string;
};

const bundledBackgroundModules = import.meta.glob('../assets/images/backgrounds/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const bundledBackgrounds: BundledBackground[] = Object.entries(bundledBackgroundModules)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path;
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const label = baseName
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());

    return { id: baseName, label, url };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const categories: Array<{ id: BackgroundCategory; label: string }> = [
  { id: 'image', label: 'Image' },
  { id: 'color', label: 'Color' },
  { id: 'slideshow', label: 'Slideshow' }
];

const repeatOptions: Array<[LayerConfig['repeat'], string]> = [
  ['no-repeat', 'No repeat'],
  ['centered', 'Centered'],
  ['repeat', 'Tile'],
  ['space', 'Space'],
  ['round', 'Round']
];

const sizeOptions: Array<[string, string]> = [
  ['cover', 'Cover'],
  ['contain', 'Contain'],
  ['auto', 'Original'],
  ['50%', '50%'],
  ['10%', '10%']
];

const readImageFile = (file: File, maxSize = BACKGROUND_MAX_SIZE): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are supported.'));
      return;
    }
    if (file.size > maxSize) {
      reject(new Error(`Image must be under ${Math.round(maxSize / (1024 * 1024))}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = event => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });

const resolveCategory = (background: LayerConfig): BackgroundCategory => {
  if (background.category) return background.category;
  if (background.slideshowEnabled || (background.slideshowImages?.length ?? 0) > 0) return 'slideshow';
  if (background.image) return 'image';
  return 'color';
};

const BackgroundView: React.FC = () => {
  const { settings, updateTemplate, updateThemeDraft } = useSettings();
  const activeTemplate = settings.themeDraft ?? settings.template;
  const background = activeTemplate.background;
  const slideshowImages = background.slideshowImages ?? [];
  const slideshowTransition = ((background as any).slideshowTransition as string) ?? "fade";
  const [activeCategory, setActiveCategory] = useState<BackgroundCategory>(() => resolveCategory(background));
  const [galleryPage, setGalleryPage] = useState(0);
  const [slideshowPreviewIndex, setSlideshowPreviewIndex] = useState(0);
  const singleImageInputRef = useRef<HTMLInputElement | null>(null);
  const slideshowInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveCategory(resolveCategory(background));
  }, [background.category, background.image, background.slideshowEnabled, slideshowImages.length]);

  useEffect(() => {
    setGalleryPage(0);
  }, [activeCategory]);

  const updateBackground = (updates: Partial<LayerConfig>) => {
    const nextBackground: LayerConfig = {
      ...background,
      ...updates
    };

    if (settings.themeDraft) updateThemeDraft({ background: nextBackground });
    else updateTemplate({ background: nextBackground });
  };

  const updateBackgroundExtra = (key: string, value: unknown) => {
    updateBackground({ [key]: value } as Partial<LayerConfig>);
  };

  const setCategory = (category: BackgroundCategory) => {
    setActiveCategory(category);
    if (category === 'slideshow') {
      updateBackground({ category, slideshowEnabled: slideshowImages.length > 0 });
      return;
    }
    updateBackground({ category, slideshowEnabled: false });
  };

  const handleSingleImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await readImageFile(file);
      updateBackground({ image, category: 'image', slideshowEnabled: false });
      setActiveCategory('image');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not load image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSlideshowImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
      .filter(file => file.type.startsWith('image/'))
      .sort((a, b) => {
        const aPath = (a as File & { webkitRelativePath?: string }).webkitRelativePath || a.name;
        const bPath = (b as File & { webkitRelativePath?: string }).webkitRelativePath || b.name;
        return aPath.localeCompare(bPath);
      });

    if (!files.length) {
      event.target.value = '';
      return;
    }

    const images = files.map(file => URL.createObjectURL(file));
    updateBackground({ category: 'slideshow', slideshowImages: images, slideshowEnabled: true });
    setActiveCategory('slideshow');
    setSlideshowPreviewIndex(0);
    event.target.value = '';
  };

  const selectBundledBackground = (url: string) => {
    updateBackground({ image: url, category: 'image', slideshowEnabled: false });
    setActiveCategory('image');
  };


  const previewImage = useMemo(() => {
    if (activeCategory === 'slideshow') return slideshowImages[0] || '';
    if (activeCategory === 'image') return background.image || '';
    return '';
  }, [activeCategory, background.image, slideshowImages]);

  const displayColor = background.color === 'transparent' ? '#0f172a' : (background.color || '#0f172a');
  const folderInputProps = { webkitdirectory: '', directory: '' } as any;
  const galleryPageCount = Math.max(1, Math.ceil(bundledBackgrounds.length / GALLERY_PAGE_SIZE));
  const galleryItems = bundledBackgrounds.slice(galleryPage * GALLERY_PAGE_SIZE, (galleryPage + 1) * GALLERY_PAGE_SIZE);
  const gallerySlots = Array.from({ length: GALLERY_PAGE_SIZE }, (_, index) => galleryItems[index] ?? null);
  const slideshowSampleImages = slideshowImages.slice(0, 8);
  const currentSlideshowPreview = slideshowSampleImages[slideshowPreviewIndex % Math.max(1, slideshowSampleImages.length)] ?? '';

  useEffect(() => {
    setGalleryPage(current => Math.min(current, Math.max(0, galleryPageCount - 1)));
  }, [galleryPageCount]);

  useEffect(() => {
    setSlideshowPreviewIndex(0);
  }, [slideshowImages.length]);

  useEffect(() => {
    if (activeCategory !== 'slideshow' || slideshowSampleImages.length < 2) return;
    const timer = window.setInterval(() => {
      setSlideshowPreviewIndex(current => (current + 1) % slideshowSampleImages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [activeCategory, slideshowSampleImages.length]);

  const panelStyle: React.CSSProperties = {
    padding: 16,
    display: 'grid',
    gap: 14
  };

  const thumbStyle = (selected: boolean): React.CSSProperties => ({
    position: 'relative',
    minHeight: 96,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 12,
    border: selected ? '2px solid var(--cu-accent, #38bdf8)' : '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(15, 23, 42, 0.65)',
    boxShadow: selected ? '0 0 0 1px rgba(56,189,248,0.22), 0 0 16px rgba(56,189,248,0.16)' : 'none',
    cursor: 'pointer'
  });

  return (
    <div className="view-container cu-view-shell cu-background-view" style={panelStyle}>
      <section className="cu-panel-card cu-background-hero" style={{ padding: 14 }}>
        <div className="cu-background-category-row" role="tablist" aria-label="Background category">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategory(category.id)}
              className={`cu-tab-button ${activeCategory === category.id ? 'is-active' : ''}`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="cu-panel-card cu-background-preview-card" style={{ padding: 14 }}>
        <div
          className="cu-background-mini-preview"
          style={{
            backgroundColor: activeCategory === 'color' ? displayColor : background.color,
            backgroundImage: previewImage ? `url(${previewImage})` : 'none',
            backgroundSize: background.size || 'cover',
            backgroundRepeat: background.repeat === 'centered' ? 'no-repeat' : background.repeat,
            backgroundPosition:
              background.repeat === 'centered'
                ? `calc(50% + ${background.xOffset || 0}px) calc(50% + ${background.yOffset || 0}px)`
                : `${background.xOffset || 0}px ${background.yOffset || 0}px`,
            opacity: background.opacity ?? 1
          }}
        >
          <div className="cu-background-preview-board" aria-hidden="true" />
        </div>
        <div className="cu-background-preview-meta">
          <strong>
            {activeCategory === 'color'
              ? 'Solid color'
              : activeCategory === 'image'
                ? (background.image ? 'Image selected' : 'Choose a background')
                : (slideshowImages.length ? `${slideshowImages.length} slide${slideshowImages.length === 1 ? '' : 's'}` : 'No slideshow folder selected')}
          </strong>
          <span>{background.size || 'cover'} · {Math.round((background.opacity ?? 1) * 100)}% opacity</span>
        </div>
      </section>

      {activeCategory === 'image' && (
        <section className="cu-panel-card cu-background-section" style={panelStyle}>
          <div className="cu-background-gallery-header">
            <div className="cu-strong">Gallery</div>
            <div className="cu-row cu-background-gallery-nav" style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap' }}>
              <span className="cu-small">{galleryPage + 1} / {galleryPageCount}</span>
              <button
                type="button"
                className="cu-inline-button cu-background-gallery-arrow"
                onClick={() => setGalleryPage(current => Math.max(0, current - 1))}
                disabled={galleryPage === 0}
                aria-label="Previous backgrounds"
              >
                ‹
              </button>
              <button
                type="button"
                className="cu-inline-button cu-background-gallery-arrow"
                onClick={() => setGalleryPage(current => Math.min(galleryPageCount - 1, current + 1))}
                disabled={galleryPage >= galleryPageCount - 1}
                aria-label="Next backgrounds"
              >
                ›
              </button>
            </div>
          </div>
          <input ref={singleImageInputRef} type="file" accept="image/*" onChange={handleSingleImage} style={{ display: 'none' }} />
          {bundledBackgrounds.length > 0 ? (
            <div className="cu-background-gallery-shell">
              <div className="cu-background-gallery-viewport">
                <div className="cu-background-gallery-page">
                  {gallerySlots.map((item, index) => {
                    if (!item) {
                      return <div key={`empty-${galleryPage}-${index}`} className="cu-background-gallery-empty" aria-hidden="true" />;
                    }

                    const selected = background.image === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="cu-background-thumb cu-background-gallery-tile"
                        style={thumbStyle(selected)}
                        onClick={() => selectBundledBackground(item.url)}
                        title={item.label}
                      >
                        <img src={item.url} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="cu-background-thumb-label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="cu-background-gallery-footer">
                <button type="button" className="cu-button-primary cu-background-gallery-browse" onClick={() => singleImageInputRef.current?.click()}>
                  Browse Images
                </button>
              </div>
            </div>
          ) : (
            <div className="cu-background-drop-zone" style={{ minHeight: 88 }}>
              <strong>No gallery images found</strong>
              <span>Add images to src/assets/images/backgrounds.</span>
            </div>
          )}
        </section>
      )}

      {activeCategory === 'color' && (
        <section className="cu-panel-card cu-background-section" style={panelStyle}>
          <div className="cu-row-between cu-wrap" style={{ alignItems: 'center', gap: 12 }}>
            <div className="cu-strong">Color</div>
            <div className="cu-row" style={{ gap: 10, alignItems: 'center' }}>
              <input type="color" value={displayColor} onChange={event => updateBackground({ color: event.target.value, category: 'color' })} className="cu-color-input" title="Background color" />
              <button type="button" className="cu-inline-button" onClick={() => updateBackground({ color: 'transparent', category: 'color' })}>
                Transparent
              </button>
            </div>
          </div>
        </section>
      )}

      {activeCategory === 'slideshow' && (
        <section className="cu-panel-card cu-background-section" style={panelStyle}>
          <div className="cu-background-folder-select-card">
            <div>
              <div className="cu-strong">Folder Slideshow</div>
              <div className="cu-small">Select a folder of images. Preview only samples up to 8 thumbnails.</div>
            </div>
            <button type="button" className="cu-button-primary cu-background-folder-button" onClick={() => slideshowInputRef.current?.click()}>
              Select Folder
            </button>
          </div>
          <input
            ref={slideshowInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSlideshowImages}
            style={{ display: 'none' }}
            {...folderInputProps}
          />
          <div className="cu-background-slideshow-controls">
            <label className="cu-checkbox-row">
              <input type="checkbox" checked={!!background.slideshowEnabled} onChange={event => updateBackground({ slideshowEnabled: event.target.checked, category: 'slideshow' })} />
              On
            </label>
            <label className="cu-row cu-small" style={{ gap: 8 }}>
              Every
              <select value={background.slideshowIntervalSeconds ?? 30} onChange={event => updateBackground({ slideshowIntervalSeconds: parseInt(event.target.value, 10) || 30 })} className="cu-select">
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </label>
            <label className="cu-row cu-small" style={{ gap: 8 }}>
              Transition
              <select value={slideshowTransition} onChange={event => updateBackgroundExtra('slideshowTransition', event.target.value)} className="cu-select">
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
                <option value="cut">Cut</option>
              </select>
            </label>
            {slideshowImages.length > 0 && (
              <button type="button" className="cu-inline-button cu-button-danger" onClick={() => updateBackground({ slideshowImages: [], slideshowEnabled: false })}>
                Clear
              </button>
            )}
          </div>
          {slideshowImages.length > 0 ? (
            <div className="cu-background-slideshow-preview-card">
              <div
                className="cu-background-slideshow-preview"
                style={{ backgroundImage: currentSlideshowPreview ? `url(${currentSlideshowPreview})` : 'none' }}
              >
                <span>{slideshowImages.length} image{slideshowImages.length === 1 ? '' : 's'} selected</span>
              </div>
              <div className="cu-background-slideshow-sample-grid">
                {slideshowSampleImages.map((image, index) => (
                  <button
                    key={`${image.slice(0, 32)}-${index}`}
                    type="button"
                    className={`cu-background-slideshow-sample ${index === slideshowPreviewIndex % Math.max(1, slideshowSampleImages.length) ? 'is-active' : ''}`}
                    onClick={() => setSlideshowPreviewIndex(index)}
                    title={`Preview slide ${index + 1}`}
                  >
                    <img src={image} alt={`Background slide sample ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cu-background-drop-zone" style={{ minHeight: 88 }}>
              <strong>No folder selected</strong>
              <span>Select Folder to load slideshow images.</span>
            </div>
          )}
        </section>
      )}

      <section className="cu-panel-card cu-background-section" style={panelStyle}>
        <div className="cu-control-grid cu-background-settings-grid">
          <label className="cu-field">
            <span>Size</span>
            <select value={background.size} onChange={event => updateBackground({ size: event.target.value })} className="cu-select">
              {sizeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="cu-field">
            <span>Repeat</span>
            <select value={background.repeat} onChange={event => updateBackground({ repeat: event.target.value as LayerConfig['repeat'] })} className="cu-select">
              {repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="cu-field">
          <div className="cu-row-between"><span>Opacity</span><strong>{Math.round((background.opacity ?? 1) * 100)}%</strong></div>
          <input type="range" min="0" max="1" step="0.05" value={background.opacity ?? 1} onChange={event => updateBackground({ opacity: parseFloat(event.target.value) })} />
        </div>
        <div className="cu-background-position-grid">
          <label><span>X</span><input type="number" value={background.xOffset || 0} onChange={event => updateBackground({ xOffset: parseInt(event.target.value, 10) || 0 })} /></label>
          <label><span>Y</span><input type="number" value={background.yOffset || 0} onChange={event => updateBackground({ yOffset: parseInt(event.target.value, 10) || 0 })} /></label>
          <label><span>Scale %</span><input type="number" value={background.scale || 100} onChange={event => updateBackground({ scale: parseInt(event.target.value, 10) || 100 })} /></label>
        </div>
      </section>
    </div>
  );
};

export default BackgroundView;
