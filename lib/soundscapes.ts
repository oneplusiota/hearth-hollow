export const presets = [
  {id: 'brown', name: 'Banked Embers', kind: 'Brown noise', caption: 'Deep, steady, unhurried.', icon: '♨', hue: 28},
  {id: 'pink', name: 'Rose Window', kind: 'Pink noise', caption: 'A softer wash of sound.', icon: '❀', hue: 340},
  {id: 'white', name: 'Frosted Pane', kind: 'White noise', caption: 'Bright, even texture.', icon: '❄', hue: 200},
  {id: 'rain', name: 'Rain on the Thatch', kind: 'Synthetic rain', caption: 'A room of your own.', icon: '☂', hue: 160},
  {id: 'ocean', name: 'Harbour Tide', kind: 'Synthetic surf', caption: 'Slowly coming and going.', icon: '⚓', hue: 210},
  {id: 'drone', name: "The Monk's Drone", kind: 'Ambient drone', caption: 'Long tones, gently changing.', icon: '☩', hue: 265},
  {id: 'tavern', name: 'The Old Inn', kind: 'Generative tavern', caption: 'Our original wandering melody.', icon: '♪', hue: 38},
  {id: 'pulse', name: 'Midnight Ride', kind: 'Generative pulse', caption: 'A steady electronic stride.', icon: '✦', hue: 305},
] as const;
export type Preset = typeof presets[number]['id'] | 'signal' | 'band';
