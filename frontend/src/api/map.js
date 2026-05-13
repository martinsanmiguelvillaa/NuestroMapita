import apiFetch from './client';

export const getMapPins = () => apiFetch('/map/pins');
