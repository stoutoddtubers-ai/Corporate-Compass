const cityData = {
  'Milwaukee, WI': {
    live: ['Hotel Metro Lounge', '8 business travelers checked in this hour'],
    pulse: [
      {place:'Hotel Metro Lounge', type:'Hotel bar · Downtown', count:8, open:3, signal:'Moderate'},
      {place:'Bryant’s Cocktail Lounge', type:'Cocktails · Mitchell Park', count:5, open:2, signal:'Relaxed'},
      {place:'Lupi & Iris', type:'Dinner · Downtown', count:12, open:4, signal:'Buzzing'}
    ],
    places: [
      {name:'Lupi & Iris', type:'Dinner · Downtown', price:52, score:'9.1', tags:['Client-friendly','Great service'], icon:'✦', image:'image-dinner'},
      {name:'Colectivo on the Square', type:'Coffee + work · East Side', price:14, score:'8.8', tags:['Strong Wi‑Fi','Solo friendly'], icon:'☕', image:'image-coffee'},
      {name:'Bryant’s Cocktail Lounge', type:'After hours · Mitchell Park', price:38, score:'9.3', tags:['Quiet booths','Local classic'], afterHours:['solo','client'], icon:'♜', image:'image-bar'},
      {name:'The Outsider', type:'After hours · Third Ward', price:48, score:'8.9', tags:['Rooftop energy','Great views'], afterHours:['group','client'], icon:'♜', image:'image-bar'},
      {name:'Boone & Crockett', type:'After hours · Bay View', price:31, score:'8.7', tags:['Easy to mingle','Late-night'], afterHours:['solo','group'], icon:'♜', image:'image-bar'},
      {name:'Milwaukee Art Museum', type:'Downtime · Lakefront', price:24, score:'8.6', tags:['Walkable','90 min visit'], icon:'▱', image:'image-attraction'},
      {name:'The Pfister Hotel', type:'Hotel · Downtown', price:175, score:'92', tags:['Independent','Great for Sales Travel','Airport ready'], icon:'⌂', image:'image-hotel'},
      {name:'Milwaukee Marriott Downtown', type:'Hotel · Downtown', price:189, score:'90', tags:['Marriott Bonvoy','Great for Conferences'], icon:'⌂', image:'image-hotel'},
      {name:'Hilton Milwaukee City Center', type:'Hotel · Westown', price:159, score:'86', tags:['Hilton Honors','Meeting-ready'], icon:'⌂', image:'image-hotel'}
    ]
  },
  'Appleton, WI': {
    live: ['Fratellos Riverfront', '4 business travelers checked in this hour'],
    pulse: [
      {place:'Fratellos Riverfront', type:'Dinner · Riverfront', count:4, open:2, signal:'Relaxed'},
      {place:'Stone Arch Brewpub', type:'Brewpub · Riverfront', count:7, open:3, signal:'Moderate'},
      {place:'Acoca Coffee', type:'Coffee · College Ave', count:2, open:0, signal:'Quiet'}
    ],
    places: [
      {name:'Carmella’s', type:'Dinner · Downtown', price:38, score:'9.2', tags:['Client-friendly','Walkable'], icon:'✦', image:'image-dinner'},
      {name:'Acoca Coffee', type:'Coffee + work · College Ave', price:12, score:'8.7', tags:['Strong Wi‑Fi','Quiet for calls'], icon:'☕', image:'image-coffee'},
      {name:'Stone Arch Brewpub', type:'After hours · Riverfront', price:31, score:'8.9', tags:['Local tap list','Easy parking'], afterHours:['solo','group'], icon:'♜', image:'image-bar'},
      {name:'McGuinness Irish Pub', type:'After hours · College Ave', price:34, score:'8.6', tags:['Lively crowd','Walkable'], afterHours:['group','client'], icon:'♜', image:'image-bar'},
      {name:'Lawlss Coffee', type:'After hours · Downtown', price:18, score:'8.5', tags:['Low-key late','Conversation-friendly'], afterHours:['solo','client'], icon:'♜', image:'image-bar'},
      {name:'Trout Museum of Art', type:'Downtime · Downtown', price:10, score:'8.4', tags:['Walkable','Quick reset'], icon:'▱', image:'image-attraction'},
      {name:'CopperLeaf Boutique Hotel', type:'Hotel · Downtown', price:139, score:'88', tags:['Independent','Great for Long-Term Stays','Easy parking'], icon:'⌂', image:'image-hotel'},
      {name:'Hilton Appleton Paper Valley', type:'Hotel · Downtown', price:149, score:'87', tags:['Hilton Honors','Convention-ready'], icon:'⌂', image:'image-hotel'},
      {name:'Courtyard Appleton Riverfront', type:'Hotel · Riverfront', price:139, score:'86', tags:['Marriott Bonvoy','Easy parking'], icon:'⌂', image:'image-hotel'}
    ]
  },
  'Chicago, IL': {
    live: ['The Gage', '17 business travelers checked in this hour'],
    pulse: [
      {place:'The Gage', type:'Dinner · Millennium Park', count:17, open:6, signal:'Buzzing'},
      {place:'Cindy’s Rooftop', type:'Rooftop · Loop', count:14, open:5, signal:'Busy'},
      {place:'Osmium Coffee Bar', type:'Coffee · Lakeview', count:3, open:1, signal:'Quiet'}
    ],
    places: [
      {name:'The Gage', type:'Dinner · Millennium Park', price:58, score:'9.0', tags:['Client-friendly','Late night'], icon:'✦', image:'image-dinner'},
      {name:'Osmium Coffee Bar', type:'Coffee + work · Lakeview', price:15, score:'8.9', tags:['Strong Wi‑Fi','Solo friendly'], icon:'☕', image:'image-coffee'},
      {name:'Cindy’s Rooftop', type:'After hours · Loop', price:63, score:'9.1', tags:['Client wow','Hotel adjacent'], afterHours:['group','client'], icon:'♜', image:'image-bar'},
      {name:'The Drawing Room', type:'After hours · Gold Coast', price:42, score:'8.8', tags:['Sophisticated','Quiet corners'], afterHours:['solo','client'], icon:'♜', image:'image-bar'},
      {name:'Federales', type:'After hours · West Loop', price:39, score:'8.7', tags:['Lively groups','Late-night'], afterHours:['group','solo'], icon:'♜', image:'image-bar'},
      {name:'Chicago Architecture Center', type:'Downtime · River North', price:18, score:'8.8', tags:['90 min visit','Worth it'], icon:'▱', image:'image-attraction'},
      {name:'Hyatt Regency Chicago', type:'Hotel · Riverwalk', price:209, score:'91', tags:['World of Hyatt','Great for Conferences'], icon:'⌂', image:'image-hotel'},
      {name:'Marriott Marquis Chicago', type:'Hotel · South Loop', price:239, score:'91', tags:['Marriott Bonvoy','Trade-show ready'], icon:'⌂', image:'image-hotel'},
      {name:'Hilton Chicago', type:'Hotel · Grant Park', price:219, score:'90', tags:['Hilton Honors','Client meeting-ready'], icon:'⌂', image:'image-hotel'}
    ]
  }
};

const restaurantReviews = {
  'Lupi & Iris': {
    verdict: 'A polished downtown dinner for a client conversation that still feels distinctly Milwaukee.',
    score: '4.8', count: '37 business traveler reviews', walk: '6 min walk', airport: '16 min drive', best: 'Tue–Thu, 6–7:30 PM',
    quote: '“The service moves at a business-dinner pace, and the tables give you room to talk without leaning in.”',
    author: 'Sales director · 14 Milwaukee trips',
    metrics: [['Good for solo dining','Excellent','good'],['Easy to expense','Itemized receipt','good'],['Wi‑Fi quality','Good','good'],['Quiet enough for calls','Best before 7 PM','okay'],['Client-friendly','Excellent','good'],['Walkable from hotels','Very walkable','good'],['Parking availability','Valet nearby','okay'],['Late-night options','Until 10 PM','okay'],['Airport proximity','16 min drive','good'],['Safe area','Comfortable at night','good'],['Dress code / vibe','Smart casual','good']]
  },
  'Carmella’s': {
    verdict: 'Warm, unfussy Italian in the heart of Appleton—an easy choice when you need dinner to simply go well.',
    score: '4.7', count: '24 business traveler reviews', walk: '4 min walk', airport: '12 min drive', best: 'Mon–Thu, 5:30–7 PM',
    quote: '“Easy walk from the downtown hotels, plenty of room at the bar if you’re solo, and nobody rushes a work conversation.”',
    author: 'Event planner · 9 Appleton trips',
    metrics: [['Good for solo dining','Bar seating is great','good'],['Easy to expense','Simple, itemized','good'],['Wi‑Fi quality','Adequate','okay'],['Quiet enough for calls','Quiet dining room','good'],['Client-friendly','Very good','good'],['Walkable from hotels','Excellent','good'],['Parking availability','Street + ramp','good'],['Late-night options','Until 9 PM','okay'],['Airport proximity','12 min drive','good'],['Safe area','Comfortable at night','good'],['Dress code / vibe','Relaxed polished','good']]
  },
  'The Gage': {
    verdict: 'A high-energy Loop staple that earns its place for impressive client dinners and a late working meal.',
    score: '4.6', count: '68 business traveler reviews', walk: '3 min walk', airport: '28 min drive', best: 'Tue–Thu, before 6 PM',
    quote: '“Request a booth or early reservation for a serious conversation. Later, the room gets livelier—but the team stays sharp.”',
    author: 'Consultant · 21 Chicago trips',
    metrics: [['Good for solo dining','Good at the bar','good'],['Easy to expense','Itemized receipt','good'],['Wi‑Fi quality','Fair','okay'],['Quiet enough for calls','Early only','okay'],['Client-friendly','Excellent','good'],['Walkable from hotels','Exceptional','good'],['Parking availability','Use a garage','okay'],['Late-night options','Until 11 PM','good'],['Airport proximity','28 min drive','okay'],['Safe area','Busy, well lit','good'],['Dress code / vibe','Business casual','good']]
  }
};

const hotelProfiles = {
  'The Pfister Hotel': { score:92, loyalty:'Marriott Bonvoy', metrics:[['Wi-Fi','9.4'],['Workspace','8.8'],['Quietness','9.1'],['Airport','9.8']], activity:{occupancy:'Moderate', elevator:'Under 2 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Conversation-friendly'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'Large desks, plenty of outlets, quiet HVAC and blackout curtains score especially well.', cost:{hotel:175, breakfast:12, lunch:18, dinner:40, uber:15}, favorites:[['Best dinner','Lupi & Iris'],['Client dinner','Harbor House'],['Coffee + work','Colectivo'],['Hotel bar','Blu'],['Gym','On-site fitness center'],['Remote work','The lobby library']], tags:['Great for Sales Travel','Great for Client Meetings','Great for Conferences'], airport:'15 min to MKE · reliable ride-share · early breakfast', event:'No major event reported tonight.'},
  'Milwaukee Marriott Downtown': { score:90, loyalty:'Marriott Bonvoy', metrics:[['Wi-Fi','9.2'],['Workspace','8.9'],['Quietness','8.7'],['Airport','9.2']], activity:{occupancy:'Busy', elevator:'2–4 min', frontDesk:'5–8 min', breakfast:'Moderate', lobby:'Professional'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'Reliable desk setups, plentiful charging, and a polished lobby make this an easy chain-hotel work-trip option.', cost:{hotel:189, breakfast:15, lunch:18, dinner:42, uber:15}, favorites:[['Best dinner','Lupi & Iris'],['Client dinner','The Outsider'],['Coffee + work','Colectivo'],['Hotel bar','East Town Kitchen'],['Gym','On-site fitness center'],['Remote work','Lobby lounge']], tags:['Great for Conferences','Great for Client Meetings','Bonvoy eligible'], airport:'16 min to MKE · ride-share available · late check-in', event:'Downtown events can increase lobby activity.'},
  'Hilton Milwaukee City Center': { score:86, loyalty:'Hilton Honors', metrics:[['Wi-Fi','8.9'],['Workspace','8.4'],['Quietness','8.3'],['Airport','9.0']], activity:{occupancy:'Moderate', elevator:'2–5 min', frontDesk:'4–7 min', breakfast:'Moderate', lobby:'Lively'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'A practical central base with dependable corporate amenities and strong convention-center convenience.', cost:{hotel:159, breakfast:14, lunch:17, dinner:40, uber:16}, favorites:[['Best dinner','Lupi & Iris'],['Client dinner','The Outsider'],['Coffee + work','Colectivo'],['Hotel bar','Monarch Lounge'],['Gym','On-site fitness center'],['Remote work','Lobby seating']], tags:['Great for Conferences','Hilton Honors','Downtown convenience'], airport:'17 min to MKE · frequent ride-share · late arrival support', event:'Convention traffic may increase elevator wait times.'},
  'CopperLeaf Boutique Hotel': { score:88, loyalty:'Independent', metrics:[['Wi-Fi','9.0'],['Workspace','8.6'],['Quietness','9.2'],['Airport','8.4']], activity:{occupancy:'Relaxed', elevator:'No wait', frontDesk:'Under 2 min', breakfast:'Quiet', lobby:'Low noise'}, rooms:['King room','Executive suite','Long-stay room'], roomNote:'A solid quiet-work pick with proper desks, accessible outlets and good lighting for calls.', cost:{hotel:139, breakfast:10, lunch:16, dinner:35, uber:12}, favorites:[['Best dinner','Carmella’s'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Acoca Coffee'],['Hotel bar','Stone Arch Brewpub'],['Gym','YMCA nearby'],['Remote work','CopperLeaf lobby']], tags:['Great for Long-Term Stays','Great for Remote Work','Easy Parking'], airport:'12 min to ATW · easy ride-share · breakfast from 6 AM', event:'No major event reported tonight.'},
  'Hilton Appleton Paper Valley': { score:87, loyalty:'Hilton Honors', metrics:[['Wi-Fi','9.0'],['Workspace','8.5'],['Quietness','8.5'],['Airport','8.5']], activity:{occupancy:'Moderate', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Professional'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'A familiar full-service choice for meetings, conventions, and a predictable business-travel stay.', cost:{hotel:149, breakfast:13, lunch:16, dinner:35, uber:12}, favorites:[['Best dinner','Carmella’s'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Acoca Coffee'],['Hotel bar','Clubhouse'],['Gym','On-site fitness center'],['Remote work','Lobby work tables']], tags:['Great for Conferences','Hilton Honors','Client Meetings'], airport:'13 min to ATW · easy ride-share · early breakfast', event:'Check the convention calendar for higher lobby traffic.'},
  'Courtyard Appleton Riverfront': { score:86, loyalty:'Marriott Bonvoy', metrics:[['Wi-Fi','9.1'],['Workspace','8.4'],['Quietness','8.6'],['Airport','8.3']], activity:{occupancy:'Relaxed', elevator:'No wait', frontDesk:'Under 3 min', breakfast:'Quiet', lobby:'Low noise'}, rooms:['King room','Executive suite','Long-stay room'], roomNote:'A streamlined Marriott option with efficient rooms, good workspace basics, and convenient parking.', cost:{hotel:139, breakfast:11, lunch:16, dinner:35, uber:12}, favorites:[['Best dinner','Carmella’s'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Acoca Coffee'],['Hotel bar','Stone Arch Brewpub'],['Gym','On-site fitness center'],['Remote work','Lobby pods']], tags:['Marriott Bonvoy','Great for Long-Term Stays','Easy Parking'], airport:'14 min to ATW · ride-share available · grab-and-go breakfast', event:'Typically quieter outside local event weekends.'},
  'Hyatt Regency Chicago': { score:91, loyalty:'World of Hyatt', metrics:[['Wi-Fi','9.1'],['Workspace','8.9'],['Quietness','8.5'],['Airport','9.3']], activity:{occupancy:'Busy', elevator:'3–6 min', frontDesk:'8–12 min', breakfast:'Packed', lobby:'Lively'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'Strong desk setups and fast Wi-Fi; request a high floor for less corridor noise during conference weeks.', cost:{hotel:209, breakfast:18, lunch:20, dinner:45, uber:18}, favorites:[['Best dinner','The Gage'],['Client dinner','Cindy’s Rooftop'],['Coffee + work','Osmium Coffee Bar'],['Hotel bar','BIG Bar'],['Gym','On-site fitness center'],['Remote work','Riverwalk seating']], tags:['Great for Conferences','Great for Trade Shows','Great for Client Meetings'], airport:'28 min to ORD · frequent ride-share · late check-in support', event:'Large conference reported: expect heavier elevator and breakfast traffic.'}
  , 'Marriott Marquis Chicago': { score:91, loyalty:'Marriott Bonvoy', metrics:[['Wi-Fi','9.3'],['Workspace','9.0'],['Quietness','8.5'],['Airport','8.9']], activity:{occupancy:'Busy', elevator:'4–7 min', frontDesk:'6–10 min', breakfast:'Busy', lobby:'Professional'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'Built for convention travel with strong meeting infrastructure, reliable workspace, and familiar Bonvoy benefits.', cost:{hotel:239, breakfast:18, lunch:21, dinner:46, uber:19}, favorites:[['Best dinner','The Gage'],['Client dinner','Cindy’s Rooftop'],['Coffee + work','Hotel lobby café'],['Hotel bar','Showroom Food Hall'],['Gym','On-site fitness center'],['Remote work','Meeting lounge']], tags:['Great for Trade Shows','Marriott Bonvoy','Great for Conferences'], airport:'31 min to ORD · ride-share pickup · late check-in support', event:'Large McCormick Place events can make this hotel exceptionally busy.'},
  'Hilton Chicago': { score:90, loyalty:'Hilton Honors', metrics:[['Wi-Fi','9.0'],['Workspace','8.8'],['Quietness','8.7'],['Airport','9.1']], activity:{occupancy:'Busy', elevator:'3–6 min', frontDesk:'5–9 min', breakfast:'Busy', lobby:'Professional'}, rooms:['King room','Executive suite','Club-level room'], roomNote:'A classic business-travel base with dependable meeting space, fast connections, and a strong Grant Park location.', cost:{hotel:219, breakfast:17, lunch:20, dinner:45, uber:19}, favorites:[['Best dinner','The Gage'],['Client dinner','Cindy’s Rooftop'],['Coffee + work','Lobby café'],['Hotel bar','Kitty O’Sheas'],['Gym','On-site fitness center'],['Remote work','Lobby seating']], tags:['Hilton Honors','Great for Conferences','Great for Client Meetings'], airport:'29 min to ORD · frequent ride-share · early breakfast', event:'Citywide events can increase activity around Grant Park.'}
};

const mapData = {
  'Milwaukee, WI': { hotels: { 'The Pfister Hotel': { x:48, y:51, places:[
    {name:'Lupi & Iris', distance:0.3, minutes:6, ease:95, safety:94, x:61, y:35},
    {name:'The Outsider', distance:0.4, minutes:8, ease:91, safety:93, x:72, y:48},
    {name:'Colectivo on the Square', distance:0.7, minutes:14, ease:86, safety:90, x:39, y:23},
    {name:'Milwaukee Art Museum', distance:0.8, minutes:16, ease:88, safety:92, x:78, y:21},
    {name:'Bryant’s Cocktail Lounge', distance:2.3, minutes:46, ease:68, safety:82, x:18, y:70},
    {name:'Boone & Crockett', distance:3.1, minutes:62, ease:63, safety:80, x:75, y:77}
  ]}, 'Milwaukee Marriott Downtown': { x:54, y:44, places:[
    {name:'Lupi & Iris', distance:0.2, minutes:4, ease:97, safety:95, x:62, y:32},
    {name:'The Outsider', distance:0.5, minutes:10, ease:91, safety:94, x:74, y:47},
    {name:'Colectivo on the Square', distance:0.6, minutes:12, ease:87, safety:90, x:36, y:24},
    {name:'Milwaukee Art Museum', distance:0.9, minutes:18, ease:86, safety:92, x:78, y:20}
  ]}, 'Hilton Milwaukee City Center': { x:40, y:57, places:[
    {name:'Lupi & Iris', distance:0.5, minutes:10, ease:91, safety:93, x:64, y:34},
    {name:'The Outsider', distance:0.8, minutes:16, ease:86, safety:91, x:75, y:47},
    {name:'Colectivo on the Square', distance:0.7, minutes:14, ease:84, safety:88, x:35, y:23},
    {name:'Bryant’s Cocktail Lounge', distance:1.8, minutes:36, ease:71, safety:82, x:18, y:70}
  ]}}},
  'Appleton, WI': { hotels: { 'CopperLeaf Boutique Hotel': { x:48, y:51, places:[
    {name:'Carmella’s', distance:0.2, minutes:4, ease:97, safety:95, x:62, y:35},
    {name:'Acoca Coffee', distance:0.3, minutes:6, ease:96, safety:94, x:35, y:27},
    {name:'Trout Museum of Art', distance:0.4, minutes:8, ease:94, safety:93, x:72, y:50},
    {name:'McGuinness Irish Pub', distance:0.5, minutes:10, ease:93, safety:92, x:28, y:57},
    {name:'Lawlss Coffee', distance:0.6, minutes:12, ease:91, safety:92, x:64, y:68},
    {name:'Stone Arch Brewpub', distance:0.8, minutes:16, ease:84, safety:90, x:20, y:75}
  ]}, 'Hilton Appleton Paper Valley': { x:52, y:46, places:[
    {name:'Carmella’s', distance:0.2, minutes:4, ease:97, safety:95, x:63, y:32},
    {name:'Acoca Coffee', distance:0.3, minutes:6, ease:96, safety:94, x:34, y:26},
    {name:'McGuinness Irish Pub', distance:0.4, minutes:8, ease:94, safety:93, x:28, y:58},
    {name:'Stone Arch Brewpub', distance:0.8, minutes:16, ease:84, safety:90, x:20, y:75}
  ]}, 'Courtyard Appleton Riverfront': { x:46, y:62, places:[
    {name:'Carmella’s', distance:0.4, minutes:8, ease:93, safety:94, x:62, y:34},
    {name:'Acoca Coffee', distance:0.6, minutes:12, ease:89, safety:92, x:34, y:26},
    {name:'Trout Museum of Art', distance:0.5, minutes:10, ease:91, safety:93, x:72, y:50},
    {name:'Stone Arch Brewpub', distance:0.3, minutes:6, ease:96, safety:92, x:22, y:75}
  ]}}},
  'Chicago, IL': { hotels: { 'Hyatt Regency Chicago': { x:48, y:51, places:[
    {name:'The Gage', distance:0.3, minutes:6, ease:94, safety:93, x:64, y:32},
    {name:'Cindy’s Rooftop', distance:0.4, minutes:8, ease:93, safety:92, x:72, y:46},
    {name:'Chicago Architecture Center', distance:0.4, minutes:8, ease:92, safety:93, x:32, y:29},
    {name:'The Drawing Room', distance:1.1, minutes:22, ease:81, safety:89, x:24, y:64},
    {name:'Federales', distance:1.4, minutes:28, ease:78, safety:87, x:73, y:72},
    {name:'Osmium Coffee Bar', distance:4.4, minutes:88, ease:60, safety:82, x:14, y:78}
  ]}, 'Marriott Marquis Chicago': { x:52, y:62, places:[
    {name:'The Gage', distance:1.1, minutes:22, ease:83, safety:91, x:63, y:31},
    {name:'Cindy’s Rooftop', distance:1.2, minutes:24, ease:82, safety:90, x:72, y:45},
    {name:'Federales', distance:1.4, minutes:28, ease:79, safety:88, x:73, y:72},
    {name:'Chicago Architecture Center', distance:1.2, minutes:24, ease:83, safety:91, x:32, y:29}
  ]}, 'Hilton Chicago': { x:43, y:59, places:[
    {name:'The Gage', distance:0.5, minutes:10, ease:93, safety:93, x:64, y:32},
    {name:'Cindy’s Rooftop', distance:0.6, minutes:12, ease:91, safety:92, x:72, y:46},
    {name:'The Drawing Room', distance:1.1, minutes:22, ease:82, safety:89, x:24, y:64},
    {name:'Chicago Architecture Center', distance:0.7, minutes:14, ease:89, safety:92, x:32, y:29}
  ]}}}
};

let currentCity = 'Milwaukee, WI';
let budget = 55;
let currentFilter = 'all';
let afterHoursContext = null;
let pulseMode = 'social';
let checkedIn = false;
let checkinIntent = 'Open to connect';
const activeRefinements = new Set();
const travelerRoles = new Set(['Sales']);
const privateReceipts = [
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Lupi & Iris', amount:52.00, file:'Receipt attached'},
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Colectivo on the Square', amount:14.80, file:'Receipt attached'},
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Hotel Metro Lounge', amount:58.00, file:'Receipt attached'}
];
const verifiedReviews = [];
let reviewSubmissionPlace = null;
let locationVerified = false;
let currentHotel = null;
let currentMapHotel = 'The Pfister Hotel';
const ratingCategories = ['Food Quality','Value for Per Diem','Client Meeting Friendly','Noise Level','Service Speed','Solo Dining Experience','Wi-Fi & Connectivity','Location & Convenience'];
let currentRatings = {};
const rewardProgress = { points:720, verifiedReviews:3, photoProofs:6, redeemed:[] };
const $ = s => document.querySelector(s);
const list = $('#placeList');

function categoryFor(place) {
  if (place.type.startsWith('Hotel')) return 'hotels';
  if (place.type.startsWith('Dinner')) return 'dinner';
  if (place.type.startsWith('Coffee')) return 'coffee';
  if (place.type.startsWith('After')) return 'drinks';
  return 'downtime';
}
function budgetClass(price) { return price <= budget ? 'perdiem' : price <= budget + 10 ? 'near' : 'over'; }
function budgetText(price) { return price <= budget ? `Within $${budget} per diem` : price <= budget + 10 ? `$${price-budget} over per diem` : `Over $${budget} per diem`; }
function matchesRefinements(place) {
  return [...activeRefinements].every(refinement => {
    if (refinement === 'under25') return place.price < 25;
    if (refinement === 'under50') return place.price < 50;
    if (refinement === 'client') return place.tags.includes('Client-friendly');
    if (refinement === 'value') return Number(place.score) >= 8.7 && place.price <= 50;
    if (refinement === 'expense') return place.price <= budget;
    if (refinement === 'premium') return place.price >= 50 && Number(place.score) >= 9;
    return true;
  });
}
function matchesAfterHours(place) { return currentFilter !== 'drinks' || !afterHoursContext || (place.afterHours || []).includes(afterHoursContext); }
function renderPlaces() {
  const places = cityData[currentCity].places.filter(p => (currentFilter === 'all' || categoryFor(p) === currentFilter) && matchesRefinements(p) && matchesAfterHours(p));
  list.innerHTML = places.map((p,i) => { const hotel = p.type.startsWith('Hotel'); return `<article class="place-card" data-place="${p.name}">
    <div class="place-image ${p.image}"><span>${p.icon}</span></div>
    <div class="place-main"><div class="place-top"><div class="place-name">${p.name}</div><button class="save" aria-label="Save ${p.name}" data-save="${i}">♡</button></div>
    <div class="place-meta">${p.type} · ${hotel ? `From $${p.price}/night` : `Avg. $${p.price}/person`}</div>
    <div class="score-line"><span class="score">${hotel ? `${p.score}/100 Business Score` : `${p.score} Stretch Score`}</span><span class="dot">·</span><span>Business traveler pick</span></div>
    <div class="tag-row">${hotel ? '<span class="tag perdiem">Company-money tested</span>' : `<span class="tag ${budgetClass(p.price)}">${budgetText(p.price)}</span>`}${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>${restaurantReviews[p.name] ? '<span class="review-link">Read business-traveler review →</span>' : hotel ? '<span class="review-link">Explore hotel intelligence →</span>' : ''}</div></article>`; }).join('');
  if (!places.length) list.innerHTML = '<p class="empty">Nothing in this category yet. Try another filter.</p>';
}
function renderPulse() {
  const pulse = [...cityData[currentCity].pulse].sort((a,b) => pulseMode === 'social' ? b.count - a.count : a.count - b.count);
  $('#pulseList').innerHTML = pulse.map(p => {
    const descriptor = p.open ? `${p.open} open to connect` : 'Work-friendly';
    const tone = p.signal === 'Busy' || p.signal === 'Buzzing' ? 'busy' : p.signal === 'Quiet' ? 'quiet' : '';
    return `<article class="pulse-place"><div class="pulse-count">${p.count}</div><div><strong>${p.place}</strong><span>${p.type} · ${descriptor}</span></div><div class="pulse-signal ${tone}">${p.signal}<br />this hour</div></article>`;
  }).join('');
}
function renderCity() {
  $('#cityName').textContent = currentCity;
  $('#cityLabel').textContent = currentCity.split(',')[0].toUpperCase();
  $('#liveTitle').textContent = cityData[currentCity].live[0];
  $('#liveStatus').textContent = cityData[currentCity].live[1];
  renderPlaces();
  renderPulse();
  renderHotelMap();
}
function walkingScore(place) { return Math.round((place.ease * .55) + (place.safety * .45)); }
function walkingLabel(score) { return score >= 90 ? 'Excellent walk' : score >= 82 ? 'Easy walk' : score >= 72 ? 'Mixed route' : 'Ride-share better'; }
function renderHotelMap() {
  const cityMap = mapData[currentCity];
  const hotelNames = Object.keys(cityMap.hotels);
  if (!cityMap.hotels[currentMapHotel]) currentMapHotel = hotelNames[0];
  const plan = cityMap.hotels[currentMapHotel];
  const walkablePlaces = plan.places.filter(place => place.distance <= 1.5);
  const nearbyCount = walkablePlaces.length;
  const averageScore = Math.round(walkablePlaces.reduce((total, place) => total + walkingScore(place), 0) / walkablePlaces.length);
  $('#mapHotelName').textContent = currentMapHotel;
  const loyalty = hotelProfiles[currentMapHotel]?.loyalty || 'Independent';
  $('#mapHotelSummary').textContent = `${loyalty} · ${nearbyCount} nearby picks · ${averageScore}/100 average walk score`;
  $('#mapCityLabel').textContent = currentCity.split(',')[0].toUpperCase();
  $('#mapHotelSelect').innerHTML = hotelNames.map(name => `<option value="${name}" ${name === currentMapHotel ? 'selected' : ''}>${name} · ${hotelProfiles[name]?.loyalty || 'Independent'}</option>`).join('');
  $('#walkabilityOverview').innerHTML = `<strong>${averageScore}</strong><div><b>Walking score from ${currentMapHotel}</b><span>Based on route ease + neighborhood safety for places within 1.5 miles.</span></div>`;
  const places = [...plan.places].sort((a,b) => a.distance - b.distance);
  $('#prototypeMap').innerHTML = `<div class="map-marker hotel" style="--x:${plan.x}%;--y:${plan.y}%">⌂<span>Your hotel</span></div>${places.filter(place => place.distance <= 1.5).map(place => `<div class="map-marker" style="--x:${place.x}%;--y:${place.y}%">•<span>${place.name.split(' ')[0]}</span></div>`).join('')}`;
  $('#nearbyMapList').innerHTML = places.map(place => { const score = walkingScore(place); const caution = score < 82 ? 'caution' : ''; return `<article class="map-result"><div><strong>${place.name}</strong><span>${place.distance.toFixed(1)} mi · about ${place.minutes} min on foot · safety ${place.safety}/100</span></div><div class="walk-score ${caution}"><b>${score}/100</b><small>${walkingLabel(score)}</small></div></article>`; }).join('');
}
function openHotelMap() { renderHotelMap(); $('#mapBackdrop').classList.add('open'); $('#mapBackdrop').setAttribute('aria-hidden','false'); }
function closeHotelMap() { $('#mapBackdrop').classList.remove('open'); $('#mapBackdrop').setAttribute('aria-hidden','true'); }
function roleText() { return [...travelerRoles].join(' + ') || 'business'; }
function renderProfileSummary() { $('#profileSummary').textContent = `✦ ${roleText()} traveler profile`; }
function earnedBadges() { const badges = ['Verified Traveler']; if (rewardProgress.photoProofs >= 5) badges.push('Local Lens'); if (rewardProgress.verifiedReviews >= 3) badges.push('Trusted Traveler'); if (rewardProgress.verifiedReviews >= 10) badges.push('Road Warrior'); return badges; }
function renderRewards() { const badges = earnedBadges(); $('#profilePointTotal').textContent = `${rewardProgress.points} points`; $('#profileBadgeSummary').textContent = badges.slice(-2).join(' · '); $('#rewardsPointTotal').textContent = rewardProgress.points; $('#badgeList').innerHTML = badges.map((badge, i) => `<span class="badge"><span>${['✦','◉','◆','▲'][i]}</span>${badge}</span>`).join(''); const offers = [{name:'$5 coffee gift card', cost:500, detail:'Use with a participating coffee partner'},{name:'10% local dining discount', cost:750, detail:'One dinner at a participating restaurant'}]; $('#rewardsShop').innerHTML = offers.map(offer => { const claimed = rewardProgress.redeemed.includes(offer.name); return `<article class="reward-offer"><div><strong>${offer.name}</strong><span>${offer.cost} points · ${offer.detail}</span></div><button data-reward="${offer.name}" data-cost="${offer.cost}" ${claimed || rewardProgress.points < offer.cost ? 'disabled' : ''}>${claimed ? 'Claimed' : 'Redeem'}</button></article>`; }).join(''); }
function addContributionRewards() { rewardProgress.verifiedReviews += 1; rewardProgress.photoProofs += 1; rewardProgress.points += 75; renderRewards(); }
function renderReceipts() {
  const selectedTrip = $('#vaultTrip').value;
  const receipts = privateReceipts.filter(receipt => receipt.trip === selectedTrip);
  const total = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  $('#receiptCount').textContent = receipts.length;
  $('#receiptTotal').textContent = `$${total.toFixed(2)}`;
  $('#receiptList').innerHTML = receipts.length ? receipts.map(receipt => `<article class="receipt-item"><div class="receipt-icon">▧</div><div><strong>${receipt.place}</strong><span>${receipt.trip.split(' · ')[0]} · ${receipt.file}</span></div><div class="receipt-amount">$${receipt.amount.toFixed(2)}<small>Private</small></div></article>`).join('') : '<p class="empty">No receipts saved to this trip yet.</p>';
}
function openReview(place) {
  const review = restaurantReviews[place.name];
  if (!review) return;
  $('#reviewContent').innerHTML = `<header class="review-hero"><p class="eyebrow">BUSINESS TRAVELER REVIEW</p><h2 id="reviewTitle">${place.name}</h2><p class="review-meta">${place.type} · Avg. $${place.price}/person</p><p class="review-profile-context">Most relevant to ${roleText()} travelers</p><div class="review-score-row"><span class="review-big-score">${review.score}</span><span class="review-score-copy">Stretch Score<br />${review.count}</span></div></header><div class="review-body"><p class="review-verdict">${review.verdict}</p><div class="review-detail-grid"><div class="review-detail"><strong>${review.walk}</strong><span>from nearby hotels</span></div><div class="review-detail"><strong>${review.airport}</strong><span>from airport</span></div><div class="review-detail"><strong>${review.best}</strong><span>best arrival window</span></div></div><h3 class="review-section-title">Business traveler breakdown</h3><div class="criteria-grid">${review.metrics.map(m => `<div class="criterion"><span class="criterion-label">${m[0]}</span><span class="criterion-value ${m[2]}">${m[1]}</span></div>`).join('')}</div><blockquote class="review-quote">${review.quote}<strong>— ${review.author}<span class="reviewer-badge">✦ Trusted Traveler</span></strong></blockquote><button class="review-submit" id="writeReview">Add a verified review · Earn 75 points</button><p class="review-note">Sample prototype data. In the live app, these signals would be aggregated from verified business-traveler reviews.</p></div>`;
  $('#reviewBackdrop').classList.add('open');
  $('#reviewBackdrop').setAttribute('aria-hidden','false');
}
function closeReview() { $('#reviewBackdrop').classList.remove('open'); $('#reviewBackdrop').setAttribute('aria-hidden','true'); }
function openHotel(place) {
  const hotel = hotelProfiles[place.name];
  if (!hotel) return;
  currentHotel = place;
  const total = Object.values(hotel.cost).reduce((sum,value) => sum + value, 0);
  $('#hotelContent').innerHTML = `<header class="hotel-hero"><p class="eyebrow">BUSINESS TRAVELER HOTEL</p><h2 id="hotelTitle">${place.name}</h2><p>${place.type} · From $${place.price}/night · ${hotel.loyalty}</p><div class="hotel-business-score"><strong>${hotel.score}/100</strong><span>Business Score<br />Would stay again on company money: <b>${hotel.stayVote || 'Absolutely'}</b></span></div></header><div class="hotel-body"><section class="hotel-section"><h3>Business score breakdown</h3><div class="hotel-metrics">${hotel.metrics.map(metric => `<div class="hotel-metric"><strong>${metric[1]}</strong><span>${metric[0]}</span></div>`).join('')}</div></section><section class="hotel-section"><h3>Hotel check-in activity</h3><div class="hotel-activity"><div class="activity-top"><i class="activity-dot"></i><strong id="hotelOccupancy">${hotel.activity.occupancy}</strong><span>right now</span></div><div class="activity-grid"><span>Elevator: <b>${hotel.activity.elevator}</b></span><span>Front desk: <b>${hotel.activity.frontDesk}</b></span><span>Breakfast: <b>${hotel.activity.breakfast}</b></span><span>Lobby: <b>${hotel.activity.lobby}</b></span></div><button class="hotel-action" id="hotelActivityBtn">Share hotel activity</button><div id="hotelActivityOptions" class="hotel-tags" hidden><button class="hotel-tag" data-hotel-activity="Empty">Empty</button><button class="hotel-tag" data-hotel-activity="Moderate">Moderate</button><button class="hotel-tag" data-hotel-activity="Busy">Busy</button><button class="hotel-tag" data-hotel-activity="Packed">Packed</button><button class="hotel-tag" data-hotel-detail="elevator" data-value="5+ min">Elevator 5+ min</button><button class="hotel-tag" data-hotel-detail="frontDesk" data-value="10+ min">Front desk 10+ min</button><button class="hotel-tag" data-hotel-detail="breakfast" data-value="Packed">Breakfast packed</button><button class="hotel-tag" data-hotel-detail="lobby" data-value="Loud">Lobby loud</button></div></div></section><section class="hotel-section"><h3>Business traveler room reviews</h3><div class="room-tags">${hotel.rooms.map((room,i) => `<button class="room-tag ${i === 0 ? 'active' : ''}" data-room="${room}">${room}</button>`).join('')}</div><p class="hotel-note">${hotel.roomNote}</p></section><section class="hotel-section"><h3>Daily travel cost estimate</h3><div class="cost-card">${Object.entries(hotel.cost).map(([name,value]) => `<div class="cost-item"><strong>$${value}</strong><span>${name}</span></div>`).join('')}<div class="cost-total">Estimated total: $${total}/day</div></div></section><section class="hotel-section"><h3>Nearby business traveler favorites</h3><div class="nearby-favorites">${hotel.favorites.map(favorite => `<div class="nearby-favorite"><span>${favorite[0]}</span><strong>${favorite[1]}</strong></div>`).join('')}</div></section><section class="hotel-section"><h3>Hotel bar ranking</h3><div class="hotel-metrics"><div class="hotel-metric"><strong>8.9</strong><span>Networking</span></div><div class="hotel-metric"><strong>8.7</strong><span>Drink quality</span></div><div class="hotel-metric"><strong>8.4</strong><span>Quietness</span></div><div class="hotel-metric"><strong>9.1</strong><span>Professional vibe</span></div></div></section><section class="hotel-section"><h3>Airport + event intelligence</h3><p class="hotel-note"><b>Airport convenience:</b> ${hotel.airport}<br /><b>Event signal:</b> ${hotel.event}</p></section><section class="hotel-section"><h3>Would you stay here again on company money?</h3><div class="stay-vote"><button data-stay="Absolutely" class="${hotel.stayVote === 'Absolutely' || !hotel.stayVote ? 'selected' : ''}">👍 Absolutely</button><button data-stay="Only if required" class="${hotel.stayVote === 'Only if required' ? 'selected' : ''}">😐 If required</button><button data-stay="Never again" class="${hotel.stayVote === 'Never again' ? 'selected' : ''}">👎 Never again</button></div></section><div class="hotel-tags">${hotel.tags.map(tag => `<span class="hotel-tag">${tag}</span>`).join('')}<span class="hotel-tag">${hotel.loyalty}</span></div><p class="hotel-note">Sample prototype hotel intelligence. Real activity and verification would be based on current traveler check-ins and verified room stays.</p></div>`;
  $('#hotelBackdrop').classList.add('open');
  $('#hotelBackdrop').setAttribute('aria-hidden','false');
}
function closeHotel() { $('#hotelBackdrop').classList.remove('open'); $('#hotelBackdrop').setAttribute('aria-hidden','true'); }
function renderRatingInputs() { $('#ratingInputs').innerHTML = ratingCategories.map(category => `<div class="rating-row"><span>${category}</span><div class="rating-stars">${[1,2,3,4,5].map(value => `<button class="rating-star ${currentRatings[category] >= value ? 'active' : ''}" type="button" data-category="${category}" data-value="${value}" aria-label="${category}: ${value} stars" aria-pressed="${currentRatings[category] === value}">★</button>`).join('')}</div></div>`).join(''); const values = Object.values(currentRatings).filter(Boolean); $('#travelerScore').textContent = values.length ? `${(values.reduce((sum,value) => sum + value, 0) / values.length).toFixed(1)} / 5` : '—'; }
function openReviewSubmission(place) { reviewSubmissionPlace = place; locationVerified = false; currentRatings = {}; $('#submissionPlace').textContent = place.name; $('#locationVerification').classList.remove('verified'); $('#locationVerificationText').textContent = 'Check that your location matches this place.'; $('#verifyLocation').textContent = 'Verify'; $('#reviewProofName').textContent = 'Add venue or food photo'; $('#submitReviewForm').reset(); renderRatingInputs(); $('#reviewSubmissionBackdrop').classList.add('open'); $('#reviewSubmissionBackdrop').setAttribute('aria-hidden','false'); }
function closeReviewSubmission() { $('#reviewSubmissionBackdrop').classList.remove('open'); $('#reviewSubmissionBackdrop').setAttribute('aria-hidden','true'); }
function openProfile() { $('#profileBackdrop').classList.add('open'); $('#profileBackdrop').setAttribute('aria-hidden','false'); }
function closeProfile() { $('#profileBackdrop').classList.remove('open'); $('#profileBackdrop').setAttribute('aria-hidden','true'); }
function openVault() { $('#vaultBackdrop').classList.add('open'); $('#vaultBackdrop').setAttribute('aria-hidden','false'); renderReceipts(); }
function closeVault() { $('#vaultBackdrop').classList.remove('open'); $('#vaultBackdrop').setAttribute('aria-hidden','true'); }
function openReceiptForm() { $('#receiptTripInput').value = $('#vaultTrip').value; $('#receiptBackdrop').classList.add('open'); $('#receiptBackdrop').setAttribute('aria-hidden','false'); }
function closeReceiptForm() { $('#receiptBackdrop').classList.remove('open'); $('#receiptBackdrop').setAttribute('aria-hidden','true'); }
function openBudget() { $('#modalBackdrop').classList.add('open'); $('#modalBackdrop').setAttribute('aria-hidden','false'); }
function showBudgetSettings() { $('#modalEyebrow').textContent = 'PER DIEM SETTINGS'; $('#modalTitle').textContent = 'Set your dinner budget'; $('#modalCopy').textContent = 'We’ll highlight places that make your expense report easy.'; $('#budgetOptions').style.display = 'grid'; $('#saveBudget').textContent = 'Save budget'; openBudget(); }
function closeBudget() { $('#modalBackdrop').classList.remove('open'); $('#modalBackdrop').setAttribute('aria-hidden','true'); }
function renderAfterHoursMode() { const labels = {solo:'Solo traveler',group:'Group travel',client:'With client'}; $('#afterHoursMode').hidden = !afterHoursContext; if (afterHoursContext) $('#afterHoursModeLabel').textContent = labels[afterHoursContext]; }
function openAfterHours() { $('#afterHoursBackdrop').classList.add('open'); $('#afterHoursBackdrop').setAttribute('aria-hidden','false'); $('#applyAfterHours').disabled = !afterHoursContext; document.querySelectorAll('.after-hours-option').forEach(button => button.classList.toggle('chosen', button.dataset.afterHours === afterHoursContext)); }
function closeAfterHours() { $('#afterHoursBackdrop').classList.remove('open'); $('#afterHoursBackdrop').setAttribute('aria-hidden','true'); }

$('#cityButton').addEventListener('click', () => { $('#cityMenu').classList.toggle('open'); $('#cityButton').setAttribute('aria-expanded', $('#cityMenu').classList.contains('open')); });
document.querySelectorAll('#cityMenu button').forEach(button => button.addEventListener('click', () => { currentCity = button.dataset.city; $('#cityMenu').classList.remove('open'); renderCity(); }));
$('#openHotelMap').addEventListener('click', openHotelMap);
$('#closeMap').addEventListener('click', closeHotelMap);
$('#mapBackdrop').addEventListener('click', e => { if (e.target === $('#mapBackdrop')) closeHotelMap(); });
$('#mapHotelSelect').addEventListener('change', e => { currentMapHotel = e.target.value; renderHotelMap(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.filter.active').classList.remove('active'); button.classList.add('active'); currentFilter = button.dataset.filter; if (currentFilter === 'drinks') { afterHoursContext = null; renderAfterHoursMode(); openAfterHours(); } else { afterHoursContext = null; renderAfterHoursMode(); renderPlaces(); } }));
$('#closeAfterHours').addEventListener('click', closeAfterHours);
$('#afterHoursBackdrop').addEventListener('click', e => { if (e.target === $('#afterHoursBackdrop')) closeAfterHours(); });
document.querySelectorAll('.after-hours-option').forEach(button => button.addEventListener('click', () => { afterHoursContext = button.dataset.afterHours; document.querySelectorAll('.after-hours-option').forEach(option => option.classList.toggle('chosen', option === button)); $('#applyAfterHours').disabled = false; }));
$('#applyAfterHours').addEventListener('click', () => { renderAfterHoursMode(); renderPlaces(); closeAfterHours(); });
$('#changeAfterHoursMode').addEventListener('click', openAfterHours);
document.querySelectorAll('.refine-filter').forEach(button => button.addEventListener('click', () => { const refinement = button.dataset.refine; if (activeRefinements.has(refinement)) { activeRefinements.delete(refinement); button.classList.remove('active'); button.setAttribute('aria-pressed','false'); } else { activeRefinements.add(refinement); button.classList.add('active'); button.setAttribute('aria-pressed','true'); } renderPlaces(); }));
$('#clearRefinements').addEventListener('click', () => { activeRefinements.clear(); document.querySelectorAll('.refine-filter.active').forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed','false'); }); renderPlaces(); });
document.querySelectorAll('.pulse-filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.pulse-filter.active').classList.remove('active'); button.classList.add('active'); pulseMode = button.dataset.pulse; renderPulse(); }));
list.addEventListener('click', e => { if (e.target.matches('[data-save]')) { e.target.classList.toggle('saved'); e.target.textContent = e.target.classList.contains('saved') ? '♥' : '♡'; return; } const card = e.target.closest('.place-card'); if (!card) return; const place = cityData[currentCity].places.find(p => p.name === card.dataset.place); if (!place) return; if (place.type.startsWith('Hotel')) openHotel(place); else openReview(place); });
$('#closeReview').addEventListener('click', closeReview);
$('#reviewBackdrop').addEventListener('click', e => { if (e.target === $('#reviewBackdrop')) closeReview(); });
$('#closeHotel').addEventListener('click', closeHotel);
$('#hotelBackdrop').addEventListener('click', e => { if (e.target === $('#hotelBackdrop')) closeHotel(); });
$('#hotelContent').addEventListener('click', e => { const activity = e.target.closest('[data-hotel-activity]'); const detail = e.target.closest('[data-hotel-detail]'); const stay = e.target.closest('[data-stay]'); if (e.target.id === 'hotelActivityBtn') { $('#hotelActivityOptions').hidden = false; e.target.classList.add('active'); e.target.textContent = 'Choose what you’re seeing'; } if (activity && currentHotel) { hotelProfiles[currentHotel.name].activity.occupancy = activity.dataset.hotelActivity; openHotel(currentHotel); } if (detail && currentHotel) { hotelProfiles[currentHotel.name].activity[detail.dataset.hotelDetail] = detail.dataset.value; openHotel(currentHotel); } if (stay && currentHotel) { hotelProfiles[currentHotel.name].stayVote = stay.dataset.stay; openHotel(currentHotel); } });
$('#reviewContent').addEventListener('click', e => { if (e.target.id === 'writeReview') { const place = cityData[currentCity].places.find(p => p.name === $('#reviewTitle').textContent); if (place) openReviewSubmission(place); } });
$('#closeReviewSubmission').addEventListener('click', closeReviewSubmission);
$('#reviewSubmissionBackdrop').addEventListener('click', e => { if (e.target === $('#reviewSubmissionBackdrop')) closeReviewSubmission(); });
$('#verifyLocation').addEventListener('click', () => { locationVerified = true; $('#locationVerification').classList.add('verified'); $('#locationVerificationText').textContent = 'Location match confirmed for this prototype.'; $('#verifyLocation').textContent = 'Verified ✓'; });
$('#reviewProof').addEventListener('change', e => { $('#reviewProofName').textContent = e.target.files[0] ? e.target.files[0].name : 'Add venue or food photo'; });
$('#ratingInputs').addEventListener('click', e => { const star = e.target.closest('.rating-star'); if (!star) return; currentRatings[star.dataset.category] = Number(star.dataset.value); renderRatingInputs(); });
$('#submitReviewForm').addEventListener('submit', e => { e.preventDefault(); const ratingsComplete = ratingCategories.every(category => currentRatings[category]); if (!locationVerified || !$('#reviewProof').files[0] || !ratingsComplete || !reviewSubmissionPlace) { $('#locationVerificationText').textContent = !locationVerified ? 'Verify your location to submit a Verified review.' : !$('#reviewProof').files[0] ? 'Add a photo of the venue or food to earn the Verified badge.' : 'Rate all eight work-travel categories to submit.'; return; } const score = Object.values(currentRatings).reduce((sum,value) => sum + value, 0) / ratingCategories.length; verifiedReviews.push({ place:reviewSubmissionPlace.name, proof:$('#reviewProof').files[0].name, ratings:{...currentRatings}, score, text:$('#reviewText').value.trim() || null }); addContributionRewards(); $('#reviewText').value = ''; closeReviewSubmission(); closeReview(); });
$('#profileSummary').addEventListener('click', openProfile);
$('#closeProfile').addEventListener('click', closeProfile);
$('#profileBackdrop').addEventListener('click', e => { if (e.target === $('#profileBackdrop')) closeProfile(); });
document.querySelectorAll('.profile-role').forEach(button => button.addEventListener('click', () => { const role = button.dataset.role; if (travelerRoles.has(role)) { travelerRoles.delete(role); button.classList.remove('chosen'); } else { travelerRoles.add(role); button.classList.add('chosen'); } }));
$('#saveProfile').addEventListener('click', () => { renderProfileSummary(); closeProfile(); });
$('#viewRewards').addEventListener('click', () => { renderRewards(); $('#rewardsBackdrop').classList.add('open'); $('#rewardsBackdrop').setAttribute('aria-hidden','false'); });
$('#closeRewards').addEventListener('click', () => { $('#rewardsBackdrop').classList.remove('open'); $('#rewardsBackdrop').setAttribute('aria-hidden','true'); });
$('#rewardsBackdrop').addEventListener('click', e => { if (e.target === $('#rewardsBackdrop')) { $('#rewardsBackdrop').classList.remove('open'); $('#rewardsBackdrop').setAttribute('aria-hidden','true'); } });
$('#rewardsShop').addEventListener('click', e => { const button = e.target.closest('[data-reward]'); if (!button || button.disabled) return; const cost = Number(button.dataset.cost); if (rewardProgress.points < cost) return; rewardProgress.points -= cost; rewardProgress.redeemed.push(button.dataset.reward); renderRewards(); });
$('#closeVault').addEventListener('click', closeVault);
$('#vaultBackdrop').addEventListener('click', e => { if (e.target === $('#vaultBackdrop')) closeVault(); });
$('#vaultTrip').addEventListener('change', renderReceipts);
$('#addReceipt').addEventListener('click', openReceiptForm);
$('#closeReceipt').addEventListener('click', closeReceiptForm);
$('#receiptBackdrop').addEventListener('click', e => { if (e.target === $('#receiptBackdrop')) closeReceiptForm(); });
$('#receiptFile').addEventListener('change', e => { $('#receiptFileName').textContent = e.target.files[0] ? e.target.files[0].name : 'Attach receipt image or PDF'; });
$('#receiptForm').addEventListener('submit', e => { e.preventDefault(); const place = $('#receiptPlace').value.trim(); const amount = Number($('#receiptAmount').value); if (!place || !amount) return; const attached = $('#receiptFile').files[0] ? $('#receiptFile').files[0].name : 'Receipt noted'; privateReceipts.unshift({ trip:$('#receiptTripInput').value, place, amount, file:attached }); $('#vaultTrip').value = $('#receiptTripInput').value; $('#receiptForm').reset(); $('#receiptFileName').textContent = 'Attach receipt image or PDF'; closeReceiptForm(); renderReceipts(); });
$('#budgetButton').addEventListener('click', showBudgetSettings); $('#closeModal').addEventListener('click', closeBudget); $('#modalBackdrop').addEventListener('click', e => { if(e.target === $('#modalBackdrop')) closeBudget(); });
document.querySelectorAll('#budgetOptions button').forEach(button => button.addEventListener('click', () => { document.querySelector('#budgetOptions .chosen').classList.remove('chosen'); button.classList.add('chosen'); budget = Number(button.dataset.budget); }));
$('#saveBudget').addEventListener('click', () => { $('#perDiemValue').textContent = `$${budget}`; closeBudget(); renderPlaces(); });
function openCheckin() { $('#checkinPlace').textContent = cityData[currentCity].live[0]; $('#checkinBackdrop').classList.add('open'); $('#checkinBackdrop').setAttribute('aria-hidden','false'); }
function closeCheckin() { $('#checkinBackdrop').classList.remove('open'); $('#checkinBackdrop').setAttribute('aria-hidden','true'); }
$('#checkInButton').addEventListener('click', openCheckin);
$('#closeCheckin').addEventListener('click', closeCheckin);
$('#checkinBackdrop').addEventListener('click', e => { if (e.target === $('#checkinBackdrop')) closeCheckin(); });
document.querySelectorAll('#intentOptions button').forEach(button => button.addEventListener('click', () => { document.querySelector('#intentOptions .chosen').classList.remove('chosen'); button.classList.add('chosen'); checkinIntent = button.dataset.intent; }));
$('#confirmCheckin').addEventListener('click', () => { if (checkedIn) return; const destination = cityData[currentCity].pulse[0]; destination.count += 1; if (checkinIntent === 'Open to connect') destination.open += 1; cityData[currentCity].live[1] = `You + ${destination.count - 1} business travelers checked in this hour`; $('#checkInButton').textContent = 'Live for 60 min'; $('#checkInButton').disabled = true; checkedIn = true; closeCheckin(); renderCity(); });
$('#addPlace').addEventListener('click', () => { $('#modalEyebrow').textContent = 'COMMUNITY PICKS'; $('#modalTitle').textContent = 'Know a work-trip gem?'; $('#modalCopy').textContent = 'Place submissions will be part of the next prototype round. For now, tell us what city deserves to be next.'; $('#budgetOptions').style.display='none'; $('#saveBudget').textContent='Sounds good'; openBudget(); });
document.querySelectorAll('.nav-item:not(.fab)').forEach(b => b.addEventListener('click', () => { document.querySelector('.nav-item.selected').classList.remove('selected'); b.classList.add('selected'); if (b.dataset.nav === 'profile') openProfile(); if (b.dataset.nav === 'trips') openVault(); }));
$('#viewAll').addEventListener('click', () => { document.querySelector('[data-filter="all"]').click(); list.scrollIntoView({behavior:'smooth',block:'start'}); });
renderCity();
renderProfileSummary();
renderRewards();
