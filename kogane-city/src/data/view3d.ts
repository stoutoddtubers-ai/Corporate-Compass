// Numbers for the third-person 3D view (src/view3d). Distances are in game pixels: one tile is
// 32 px, about 2 metres, so a person is about 28 px tall. All of these are PLACEHOLDER tuning.

export const VIEW3D = {
  /** Which view a new player starts in: '3d' (third person) or '2d' (the three-quarter view). C switches. */
  defaultView: '3d' as '3d' | '2d',
  fov: 62, // degrees, top to bottom
  /** How far the camera can see; fog fades the city out before this. */
  drawDist: 3200,
  pixelRatio: 1.5, // at most this many screen pixels per CSS pixel (lower = faster)

  camera: {
    mouse: 0.0026, // radians turned per pixel of mouse movement
    pitchMin: -0.2, pitchMax: 0.8, pitchStart: 0.22, // how far the camera tilts down (radians)
    // on foot: distance behind Jun, height of the point it looks at, and how far to his right it sits
    footDist: 96, lookHeight: 24, shoulder: 15,
    aimDist: 62, aimShoulder: 19, // holding right click (steady aim): closer, over the shoulder
    // driving: distance grows with speed; the camera swings back behind the car after this many seconds without mouse movement
    carDist: 150, carDistFast: 230, carLook: 22, carReturn: 1.4, carFollow: 3.5,
    // indoors: higher and steeper, so the walls do not get in the way
    roomDist: 190, roomPitch: 1.0,
    cutOrbit: 0.12, // radians per second the camera circles Jun during cutscenes
    follow: 14, // how quickly the camera catches up (higher = stiffer)
  },

  /** Storey height for buildings, and the range of storeys (the 2.5D height value picks within it). */
  floor: 44, minFloors: 2, maxFloors: 20,
  /** Heights of low things, in px. */
  low: { fence: 36, container: 42, boxcar: 48, shelf: 30 } as Record<string, number>,
  roomScale: 24, // interior walls and furniture: their height value times this

  person: { skin: '#e0b48c', trousers: 0.45 }, // trousers are the jacket colour this dark (0..1)

  fog: { dayNear: 900, dayFar: 2900, nightNear: 600, nightFar: 2300, rainNear: 350, rainFar: 1600 },
  sky: { day: 0xaebfcc, dusk: 0xe0a070, night: 0x0b1020 },
  room: { ambient: 0.8, sun: 0.25 },

  /** Place names over doors are shown this close. */
  labelDist: 900,
  /** Colours of the "go here" beams. */
  beams: { mission: 0xe8b923, side: 0xc060ff, job: 0x40d0c0 },
};
