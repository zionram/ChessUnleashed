import React from 'react';

export interface ViewConfig {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  defaultEnabled: boolean;
  position: 'left' | 'right' | 'bottom' | 'top' | 'center';
}

const views: ViewConfig[] = [];

export const registerView = (config: ViewConfig) => {
  if (views.find(v => v.id === config.id)) return;
  views.push(config);
};

export const getRegisteredViews = () => [...views];
