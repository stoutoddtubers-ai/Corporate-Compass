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
      {name:'Bryant’s Cocktail Lounge', type:'After hours · Drinks & Nightlife', price:38, score:'9.3', tags:['Cocktail bar','Solo friendly','Noise: low'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'The Outsider', type:'After hours · Drinks & Nightlife', price:48, score:'8.9', tags:['Rooftop bar','Outdoor seating','Client-friendly'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Boone & Crockett', type:'After hours · Drinks & Nightlife', price:31, score:'8.7', tags:['Late-night','Networking-friendly','Value'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Lake Park Golf Course', type:'After hours · Golf', price:22, score:'8.5', tags:['Public course','Quick round','Rental clubs'], afterHoursCategory:'golf', icon:'⛳', image:'image-golf'},
      {name:'Milwaukee Art Museum', type:'After hours · Local Attraction', price:24, score:'8.6', tags:['Indoor','90 min visit','Walkable'], afterHoursCategory:'attractions', icon:'▱', image:'image-attraction'},
      {name:'Milwaukee Lakefront Trail', type:'After hours · Fitness & Wellness', price:0, score:'8.8', tags:['Running route','Free','Outdoor'], afterHoursCategory:'wellness', icon:'◎', image:'image-wellness'},
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
      {name:'VIA Pizza Napoletana', type:'Dinner · Appleton', price:26, score:'8.9', tags:['Per diem friendly','Business lunch','Solo-friendly','Not fast food'], icon:'✦', image:'image-dinner', logoText:'VIA', logoSrc:'https://www.google.com/s2/favicons?domain=carmellasbistro.com&sz=128'},
      {name:'Apollon', type:'Dinner · Downtown Appleton', price:44, score:'9.2', tags:['Client dinner','Fine dining','Reservation recommended','Higher per diem'], icon:'✦', image:'image-dinner', logoText:'AP'},
      {name:'Rye', type:'Lunch + Dinner · Downtown Appleton', price:42, score:'9.3', tags:['Business lunch','Client dinner','Full bar','Hotel adjacent'], icon:'✦', image:'image-dinner', logoText:'Rye'},
      {name:'Ellinor', type:'Dinner · City Park Appleton', price:42, score:'9.1', tags:['Wood-fired','Client dinner','Reservation recommended','Street parking'], icon:'✦', image:'image-dinner', logoText:'EL'},
      {name:'Fratellos Riverfront Restaurant', type:'Dinner · Riverfront', price:42, score:'9.0', tags:['Client lunch','River views','Full bar','Reservation recommended'], afterHours:['group','client'], icon:'✦', image:'image-dinner', logoText:'fr', logoSrc:'https://www.google.com/s2/favicons?domain=fratelloswaterfront.com&sz=128'},
      {name:'Bowl 91', type:'Dinner · Downtown', price:19, score:'8.7', tags:['Under $25','Solo-friendly'], icon:'✦', image:'image-dinner'},
      {name:'Sai Ram Indian Cuisine', type:'Dinner · Appleton', price:24, score:'8.6', tags:['Per diem friendly','Quick lunch'], icon:'✦', image:'image-dinner'},
      {name:'Antojitos Mexicanos', type:'Dinner · Downtown', price:22, score:'8.7', tags:['Under $25','Walkable'], icon:'✦', image:'image-dinner'},
      {name:'Author’s Kitchen + Bar', type:'Dinner · Downtown', price:24, score:'8.8', tags:['Per diem friendly','Breakfast + lunch'], icon:'✦', image:'image-dinner'},
      {name:'SAP Brunch, Brown Bag & Bakery', type:'Dinner · Downtown', price:18, score:'8.8', tags:['Under $25','Best value'], icon:'✦', image:'image-dinner'},
      {name:'Mark’s East Side', type:'Dinner · Appleton', price:48, score:'9.0', tags:['Client-friendly','Wisconsin supper club'], icon:'✦', image:'image-dinner'},
      {name:'George’s Steakhouse', type:'Dinner · Appleton', price:58, score:'9.0', tags:['Client-friendly','Premium'], icon:'✦', image:'image-dinner'},
      {name:'Red Ox Seafood & Steakhouse', type:'Dinner · Appleton', price:52, score:'8.9', tags:['Client-friendly','Group-ready'], icon:'✦', image:'image-dinner'},
      {name:'Dick & Joan’s 220 Club', type:'Dinner · Appleton', price:45, score:'8.9', tags:['Client-friendly','Classic supper club'], icon:'✦', image:'image-dinner'},
      {name:'Stuc’s Pizza', type:'Dinner · Appleton', price:20, score:'8.6', tags:['Under $25','Casual'], icon:'✦', image:'image-dinner'},
      {name:'Good Company', type:'Dinner · Appleton', price:28, score:'8.7', tags:['Best value','Group-ready'], icon:'✦', image:'image-dinner'},
      {name:'Pullmans at Trolley Square', type:'Dinner · Riverfront', price:34, score:'8.7', tags:['Patio','Business casual'], icon:'✦', image:'image-dinner'},
      {name:'Home Burger Bar', type:'Dinner · Downtown', price:22, score:'8.6', tags:['Under $25','Casual'], icon:'✦', image:'image-dinner'},
      {name:'Thai Ginger Bistro', type:'Dinner · Appleton', price:25, score:'8.6', tags:['Per diem friendly','Solo-friendly'], icon:'✦', image:'image-dinner'},
      {name:'Nakashima of Japan', type:'Dinner · Appleton', price:39, score:'8.7', tags:['Group-ready','Client-friendly'], icon:'✦', image:'image-dinner'},
      {name:'Victoria’s Italian Cuisine', type:'Dinner · Appleton', price:30, score:'8.6', tags:['Casual','Per diem friendly'], icon:'✦', image:'image-dinner'},
      {name:'Basil Café', type:'Dinner · Appleton', price:23, score:'8.6', tags:['Under $25','Quick lunch'], icon:'✦', image:'image-dinner'},
      {name:'Wilder’s Bistro', type:'Dinner · Downtown', price:36, score:'8.8', tags:['Local favorite','Business casual'], icon:'✦', image:'image-dinner'},
      {name:'Acoca Coffee', type:'Coffee + work · College Ave', price:12, score:'8.7', tags:['Strong Wi‑Fi','Quiet for calls'], icon:'☕', image:'image-coffee'},
      {name:'Copper Rock Coffee', type:'Coffee + work · Downtown', price:14, score:'8.8', tags:['Strong Wi‑Fi','Remote work'], icon:'☕', image:'image-coffee'},
      {name:'Draft Gastropub', type:'After hours · Drinks & Nightlife', price:36, score:'8.9', tags:['Client-friendly','Business casual','Networking'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Stone Arch Brewpub', type:'After hours · Drinks & Nightlife', price:31, score:'8.9', tags:['Craft beer','Team-friendly','Events'], afterHoursCategory:'drinks', icon:'✦', image:'image-dinner', logoText:'SA'},
      {name:'Appleton Beer Factory', type:'After hours · Drinks & Nightlife', price:30, score:'8.7', tags:['Brewery','Walkable','Value'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Clubhouse Kitchen & Bar', type:'After hours · Drinks & Nightlife', price:33, score:'8.6', tags:['Group-ready','Late-night','Service'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'McGuinness Irish Pub', type:'After hours · Drinks & Nightlife', price:34, score:'8.6', tags:['Lively crowd','Walkable','Live music potential'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Lawlss Coffee', type:'After hours · Drinks & Nightlife', price:18, score:'8.5', tags:['Low-key late','Conversation-friendly','Solo friendly'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Reid Golf Course', type:'After hours · Golf', price:28, score:'8.4', tags:['Public course','Twilight potential','Corporate friendly'], afterHoursCategory:'golf', icon:'⛳', image:'image-golf'},
      {name:'Trout Museum of Art', type:'After hours · Local Attraction', price:10, score:'8.4', tags:['Indoor','Quick reset','Walkable'], afterHoursCategory:'attractions', icon:'▱', image:'image-attraction'},
      {name:'Fox River Trail', type:'After hours · Fitness & Wellness', price:0, score:'8.7', tags:['Running trail','Free','Walkable'], afterHoursCategory:'wellness', icon:'◎', image:'image-wellness'},
      {name:'Hilton Appleton Paper Valley', type:'Hotel · Downtown convention hub', price:149, score:'95', tags:['Hilton Honors','Convention center','Walkable downtown'], icon:'⌂', image:'image-hotel'},
      {name:'DoubleTree by Hilton Appleton', type:'Hotel · Airport / west business district', price:139, score:'93', tags:['Hilton Honors','Airport shuttle','Free parking'], icon:'⌂', image:'image-hotel'},
      {name:'Residence Inn Appleton', type:'Hotel · Extended stay / airport district', price:139, score:'94', tags:['Marriott Bonvoy','Full kitchens','Long stays'], icon:'⌂', image:'image-hotel'},
      {name:'CopperLeaf Boutique Hotel', type:'Hotel · Downtown boutique', price:169, score:'96', tags:['Independent','Executive travel','Rye access'], icon:'⌂', image:'image-hotel'},
      {name:'Home2 Suites by Hilton Appleton', type:'Hotel · Extended stay / north business district', price:129, score:'94', tags:['Hilton Honors','Kitchenettes','Free breakfast'], icon:'⌂', image:'image-hotel'},
      {name:'Cambria Hotel Appleton', type:'Hotel · North Appleton', price:129, score:'92', tags:['Choice Privileges','Modern rooms','On-site bar'], icon:'⌂', image:'image-hotel'},
      {name:'Hilton Garden Inn Appleton/Kimberly', type:'Hotel · East Fox Cities', price:129, score:'91', tags:['Hilton Honors','Team travel','Easy parking'], icon:'⌂', image:'image-hotel'},
      {name:'Country Inn & Suites Appleton North', type:'Hotel · North Fox Cities', price:109, score:'89', tags:['Radisson Rewards','Best value','Free breakfast'], icon:'⌂', image:'image-hotel'},
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
      {name:'Cindy’s Rooftop', type:'After hours · Drinks & Nightlife', price:63, score:'9.1', tags:['Rooftop bar','Client wow','Reservations'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'The Drawing Room', type:'After hours · Drinks & Nightlife', price:42, score:'8.8', tags:['Hotel bar','Quiet corners','Solo friendly'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Federales', type:'After hours · Drinks & Nightlife', price:39, score:'8.7', tags:['Lively groups','Late-night','Networking'], afterHoursCategory:'drinks', icon:'♜', image:'image-bar'},
      {name:'Five Iron Golf Chicago', type:'After hours · Golf', price:45, score:'8.7', tags:['Indoor simulator','Group-friendly','Rental clubs'], afterHoursCategory:'golf', icon:'⛳', image:'image-golf'},
      {name:'Chicago Architecture Center', type:'After hours · Local Attraction', price:18, score:'8.8', tags:['90 min visit','Indoor','Worth it'], afterHoursCategory:'attractions', icon:'▱', image:'image-attraction'},
      {name:'Chicago Lakefront Trail', type:'After hours · Fitness & Wellness', price:0, score:'8.9', tags:['Running route','Free','Outdoor'], afterHoursCategory:'wellness', icon:'◎', image:'image-wellness'},
      {name:'Hyatt Regency Chicago', type:'Hotel · Riverwalk', price:209, score:'91', tags:['World of Hyatt','Great for Conferences'], icon:'⌂', image:'image-hotel'},
      {name:'Marriott Marquis Chicago', type:'Hotel · South Loop', price:239, score:'91', tags:['Marriott Bonvoy','Trade-show ready'], icon:'⌂', image:'image-hotel'},
      {name:'Hilton Chicago', type:'Hotel · Grant Park', price:219, score:'90', tags:['Hilton Honors','Client meeting-ready'], icon:'⌂', image:'image-hotel'}
    ]
  }
};

const foodProfiles = {
  'Lupi & Iris': {type:'global', atmosphere:['client','memorable']},
  'The Gage': {type:'casual', atmosphere:['client','memorable']},
  'Carmella’s': {type:'italian', atmosphere:['client','solo']},
  'VIA Pizza Napoletana': {type:'italian', atmosphere:['solo','quick','client']},
  'Apollon': {type:'global', atmosphere:['client','memorable']},
  'Rye': {type:'casual', atmosphere:['client','memorable']},
  'Ellinor': {type:'casual', atmosphere:['client','memorable']},
  'Fratellos Riverfront Restaurant': {type:'italian', atmosphere:['client','memorable']},
  'Stone Arch Brewpub': {type:'casual', atmosphere:['solo','quick','client']},
  'Bowl 91': {type:'global', atmosphere:['solo','quick']},
  'Sai Ram Indian Cuisine': {type:'global', atmosphere:['solo','quick']},
  'Antojitos Mexicanos': {type:'global', atmosphere:['solo','quick']},
  'Author’s Kitchen + Bar': {type:'casual', atmosphere:['solo','quick']},
  'SAP Brunch, Brown Bag & Bakery': {type:'casual', atmosphere:['solo','quick']},
  'Mark’s East Side': {type:'steak', atmosphere:['client','memorable']},
  'George’s Steakhouse': {type:'steak', atmosphere:['client','memorable']},
  'Red Ox Seafood & Steakhouse': {type:'steak', atmosphere:['client','memorable']},
  'Dick & Joan’s 220 Club': {type:'steak', atmosphere:['client','memorable']},
  'Stuc’s Pizza': {type:'casual', atmosphere:['solo','quick']},
  'Good Company': {type:'casual', atmosphere:['solo','quick']},
  'Pullmans at Trolley Square': {type:'casual', atmosphere:['client','memorable']},
  'Home Burger Bar': {type:'casual', atmosphere:['solo','quick']},
  'Thai Ginger Bistro': {type:'global', atmosphere:['solo','quick']},
  'Nakashima of Japan': {type:'global', atmosphere:['client','memorable']},
  'Victoria’s Italian Cuisine': {type:'italian', atmosphere:['client','solo']},
  'Basil Café': {type:'global', atmosphere:['solo','quick']},
  'Wilder’s Bistro': {type:'global', atmosphere:['client','memorable']}
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
  'VIA Pizza Napoletana': {
    verdict: 'A local Neapolitan pizza spot that stretches a per diem better than upscale dining while still feeling elevated.',
    score: '4.3', count: 'App breakdown · high-confidence venue data', walk: 'Drive recommended', airport: '10 min drive', best: 'Tue–Sat lunch or early dinner',
    quote: '“Strong local pizza option that should fit many dinner per-diems better than upscale dining.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.5 / 5','good'],['Business Lunch Fit','4.4 / 5','good'],['Business Dinner Fit','3.8 / 5','okay'],['Per Diem Value','4.1 / 5','good'],['Speed / Quick Meal Fit','3.8 / 5','okay'],['Atmosphere','4.2 / 5','good'],['Client-Friendly','3.9 / 5','okay'],['Solo Traveler Comfort','4.4 / 5','good'],['Group-Friendly','4.0 / 5','good'],['Dietary Flexibility','4.0 / 5','good'],['After-Work Drinks','3.4 / 5','okay']],
    details: {
      snapshot: 'VIA Pizza Napoletana is a local Appleton concept serving Neapolitan pizza, salads, small plates, soups, sandwiches, desserts, and local grass-fed milk gelato in a casual Italian street-style setting.',
      businessSummary: 'Best for solo business lunch, casual client lunch, team lunch, casual dinner, coworker meals, and per-diem-conscious dinners. Less ideal for formal upscale client hosting.',
      contact: [['Address','716 N. Casaloma Drive, Appleton, WI 54913'],['Phone','920-441-0416'],['Hours','Tue–Sat lunch 11 AM–2 PM; dinner 4 PM–9 PM. Closed Sun–Mon.'],['Reservations','Accepted by phone or in person; dinner reservations are limited to leave room for walk-ins.']],
      menu: ['24-hour fermented dough finished in a custom-built Naples oven','Margherita, marinara, pepperoni with Calabrian chili honey, sausage and mushroom, eggplant, capricciosa, carbonara pizza, and scampi pizza','Salads, meatballs, pasta fagioli, shrimp scampi, lunch-only sandwiches, desserts, coffee, and gelato'],
      dietary: 'Gluten-free and vegan options are available, but VIA is not a certified gluten-free kitchen. Severe allergies or celiac disease should be treated with caution.',
      perDiem: 'Moderate / good value for quality. Best strategy: order pizza or salad at lunch/dinner; skip multiple small plates and alcohol if staying under a tighter allowance.',
      useCases: [['Solo business lunch','4.5 / 5'],['Casual client lunch','4.0 / 5'],['Team lunch','4.2 / 5'],['Casual dinner','4.5 / 5'],['Quick meal between meetings','3.8 / 5'],['After-work dinner with coworker','4.2 / 5'],['Upscale client dinner','3.2 / 5'],['Budget / per-diem stretch','4.1 / 5']],
      busyRisk: 'Medium at lunch; medium-to-high at dinner because evening space can be limited.',
      prompts: ['How long was the wait?','Did you have a reservation?','Was it fast enough for a workday lunch?','Was it quiet enough for a business conversation?','Did it feel like a good per-diem value?','Was seating available for walk-ins?'],
      tags: ['Pizza','Neapolitan Pizza','Local Favorite','Lunch','Dinner','Business Lunch','Casual Dinner','Per Diem Friendly','Solo Traveler Friendly','Group Friendly','Reservation Recommended','Walk-Ins','Not Fast Food','Italian','Gelato','Salads','Small Plates','Gluten-Free Options','Vegan Options'],
      confidence: [['High confidence','Address, phone, hours, cuisine, menu style, reservations, menu structure, dietary note'],['Needs in-app validation','Average ticket price, exact wait times, parking, noise level, Wi‑Fi, lunch speed, true per-diem value']]
    }
  },
  'Apollon': {
    verdict: 'Client-dinner worthy Greek and Mediterranean fine dining in downtown Appleton — polished, local, and not the best budget stretch.',
    score: '4.4', count: 'App breakdown · high-confidence venue data', walk: 'Downtown Appleton', airport: '12 min drive', best: 'Mon–Thu dinner or early Fri–Sat',
    quote: '“One of Appleton’s stronger picks for client dinners, vendor meals, and a polished local dinner instead of a chain.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.6 / 5','good'],['Business Dinner Fit','4.8 / 5','good'],['Business Lunch Fit','0.5 / 5','low'],['Per Diem Value','3.0 / 5','okay'],['Speed / Quick Meal Fit','2.6 / 5','okay'],['Atmosphere','4.6 / 5','good'],['Client-Friendly','4.8 / 5','good'],['Solo Traveler Comfort','4.1 / 5','good'],['Group-Friendly','4.0 / 5','good'],['Dietary Flexibility','3.6 / 5','okay'],['After-Work Drinks','3.6 / 5','okay']],
    details: {
      snapshot: 'Apollon is a local, family-owned Greek and Mediterranean fine-dining restaurant in downtown Appleton, offering lamb, seafood, steak, Greek classics, wine, knowledgeable service, and a warm dinner atmosphere.',
      businessSummary: 'Best positioned as a client dinner, business dinner, upscale local dinner, vendor meal, or special-occasion restaurant. It is dinner-only, so it should not be treated as a lunch or quick-meal option.',
      contact: [['Address','207 N. Appleton St., Appleton, WI 54911'],['Phone','920-739-1122'],['Hours','Mon–Thu 4 PM–9 PM; Fri–Sat 4 PM–10 PM. Closed Sunday.'],['Reservations','Phone and online reservation options are listed. Phone reservations must be confirmed before arrival.']],
      menu: ['Greek and Mediterranean fine dining with appetizers, seafood, lamb, steak, Greek classic dinners, desserts, drinks, and wine','Notable items include saganaki flaming cheese, meze, octopus, Scottish salmon, stuffed grouper, Mediterranean grouper, mixed grille, flaming rack of lamb, lamb sofrito, filet mignon, rib-eye steak, moussaka, pastitsio, gyros dinner, spanakopita, chicken with mushrooms and feta, shrimp Santorini, baklava, and galaktoboureko','Current official hours show dinner only; older listings may show a later opening time, but the app should treat Apollon’s website as the source of truth'],
      dietary: 'Dietary and allergy handling needs in-app/user validation. Travelers with allergies should call ahead before using Apollon for a client or group meal.',
      perDiem: 'Moderate to expensive. It can work under a dinner per diem with classic dinners such as gyros, spanakopita, moussaka, pastitsio, chicken, or shrimp Santorini around the $20–$26 range. Premium lamb, filet, steak, seafood features, appetizers, drinks, and dessert can push the ticket up quickly, with several entrées around $36–$50 or market price.',
      useCases: [['Solo business dinner','4.2 / 5'],['Client dinner','4.8 / 5'],['Team dinner','4.1 / 5'],['Quick lunch','0.5 / 5'],['Quick dinner between meetings','2.5 / 5'],['After-work drinks','3.6 / 5'],['Special occasion while traveling','4.7 / 5'],['Budget / per-diem stretch','2.4 / 5']],
      busyRisk: 'Medium to high during prime dinner times, especially Friday/Saturday or downtown event nights. Reservation importance: high.',
      prompts: ['How long was the wait?','Did you have a reservation?','Was it quiet enough for a business conversation?','Would you bring a client here?','Did the meal stay under your per diem?','Was parking easy downtown?'],
      tags: ['Greek','Mediterranean','Fine Dining','Client Dinner','Business Dinner','Local Favorite','Dinner Only','Reservation Recommended','Wine','Lamb','Seafood','Steak','Downtown Appleton','Not Fast Food','Date Night','Special Occasion','Higher Per Diem','Group Dinner'],
      confidence: [['High confidence','Address, phone, hours, reservation method, cuisine, and menu structure'],['Needs in-app validation','Average ticket, parking, noise, service speed, wait times, Wi‑Fi, and allergy handling']]
    }
  },
  'Rye': {
    verdict: 'A polished downtown Appleton pick for business lunch, client dinner, solo dining, and after-work drinks — flexible, local, and hotel-adjacent.',
    score: '4.5', count: 'App breakdown · high-confidence venue data', walk: 'Next to CopperLeaf', airport: '12 min drive', best: 'Mon–Thu lunch or early dinner',
    quote: '“Strong business lunch and client dinner option — watch apps, cocktails, steak, and seafood.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.6 / 5','good'],['Business Lunch Fit','4.6 / 5','good'],['Business Dinner Fit','4.8 / 5','good'],['Per Diem Value','3.3 / 5','okay'],['Speed / Quick Meal Fit','3.2 / 5','okay'],['Atmosphere','4.6 / 5','good'],['Client-Friendly','4.8 / 5','good'],['Solo Traveler Comfort','4.4 / 5','good'],['Group-Friendly','4.2 / 5','good'],['Dietary Flexibility','4.0 / 5','good'],['After-Work Drinks','4.5 / 5','good']],
    details: {
      snapshot: 'Rye is a refined contemporary American restaurant in downtown Appleton serving lunch, dinner, cocktails, wine, and seasonal chef-driven dishes in a stylish urban-rustic setting.',
      businessSummary: 'One of Appleton’s strongest all-around business traveler restaurants because it works for lunch, dinner, client hosting, solo dining, and after-work drinks. It is not the cheapest per-diem option, but it offers a polished local alternative to chain dining, especially for travelers staying or meeting downtown.',
      contact: [['Address','308 W. College Ave., Appleton, WI 54911'],['Phone','920-380-4745'],['Hours','Mon–Thu 12 PM–9 PM; Fri–Sat 12 PM–10 PM. Closed Sunday.'],['Reservations','Recommended. Phone and online reservation options are listed.']],
      menu: ['Contemporary American menu with starters, shareables, salads, burgers, pasta, risotto, pork, chicken, seafood, steak, desserts, cocktails, wine, and beer','Menu examples include oysters, artisan cheese and charcuterie, French onion soup, cheddar cheese curds, crab cakes, ahi tuna, whiskey bacon shrimp, Wagyu pimento cheeseburger, braised beef wild mushroom ragu, local sweet corn ravioli, pork schnitzel, Duroc pork chop, Tuscan chicken, short rib, mushroom risotto, Norwegian cod, filet, and ribeye','Strong after-work drinks profile: artisan cocktails, wine, local beer, lounge seating, full bar, patio/outdoor dining, private room, takeout, vegan, gluten-free options, and wine are listed attributes'],
      dietary: 'Gluten-free and vegan attributes are listed, but allergy handling and exact dietary details should be validated in-app or directly with the restaurant.',
      perDiem: 'Moderate to expensive. OpenTable lists Rye in the $31–$50 band, placing it above casual per-diem spots but below the most expensive fine-dining options. For a tighter allowance, choose the cheeseburger, pork schnitzel, mushroom risotto, salad, or one entrée without drinks. Shared starters, cocktails, steak, seafood, dessert, or private-dining style meals can raise the ticket quickly.',
      useCases: [['Solo business lunch','4.3 / 5'],['Client lunch','4.6 / 5'],['Solo business dinner','4.5 / 5'],['Client dinner','4.8 / 5'],['Team dinner','4.3 / 5'],['Quick lunch between meetings','3.3 / 5'],['After-work drinks','4.5 / 5'],['Budget / per-diem stretch','3.0 / 5']],
      busyRisk: 'Medium to high during lunch rush, prime dinner, Friday/Saturday, and downtown event nights. Street parking is listed, so the app should collect real feedback on parking ease during busy downtown times.',
      prompts: ['How long was the wait?','Did you have a reservation?','Was lunch fast enough for a workday schedule?','Was it quiet enough for a business conversation?','Did the meal stay under your per diem?','Was parking easy downtown?','Would you bring a client here?','Was the bar/lounge a good after-work stop?'],
      tags: ['American','Contemporary American','Fine Dining','Business Lunch','Client Dinner','Business Dinner','Downtown Appleton','Hotel Adjacent','CopperLeaf','Full Bar','Cocktails','Wine','Beer','Patio','Private Dining','Lounge','Local Favorite','Seasonal Menu','Locally Sourced','Not Fast Food','Reservation Recommended','Higher Per Diem','Date Night','Team Dinner'],
      confidence: [['High confidence','Address, phone, hours, lunch/dinner service, reservations, menu structure, cuisine, and bar/lounge features'],['Needs in-app validation','Average ticket, parking, noise level, wait times, Wi‑Fi, service speed, and allergy handling']]
    }
  },
  'Ellinor': {
    verdict: 'A creative wood-fired neighborhood dinner worth planning for — memorable and local, but better for quality than budget.',
    score: '4.3', count: 'App breakdown · high-confidence venue data', walk: 'City Park area', airport: '11 min drive', best: 'Wed–Thu dinner or early Fri–Sat',
    quote: '“Creative local dinner worth planning for — better for quality than budget.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.6 / 5','good'],['Business Lunch Fit','0.5 / 5','low'],['Business Dinner Fit','4.5 / 5','good'],['Per Diem Value','3.2 / 5','okay'],['Speed / Quick Meal Fit','2.5 / 5','okay'],['Atmosphere','4.6 / 5','good'],['Client-Friendly','4.5 / 5','good'],['Solo Traveler Comfort','4.2 / 5','good'],['Group-Friendly','3.5 / 5','okay'],['Dietary Flexibility','3.9 / 5','okay'],['After-Work Drinks','3.5 / 5','okay']],
    details: {
      snapshot: 'Ellinor is an upscale-casual Appleton neighborhood restaurant in the historic City Park area, built around an open kitchen and wood-fired oven with a creative menu rooted in local ingredients and relationships with nearby farmers and producers.',
      businessSummary: 'A strong Appleton pick for business travelers looking for a memorable local dinner instead of a chain. It works best for small client dinners, solo travelers who want a quality meal, and special-occasion style dining, but it requires planning because dinner service is limited and reservations are strongly recommended.',
      contact: [['Address','1016 E. Pacific St., Appleton, WI 54911'],['Phone','920-903-7771'],['Hours','Wed–Thu 4 PM–9 PM; Fri–Sat 4 PM–9:30 PM. Closed Sun–Tue.'],['Reservations','Uses Resy for online reservations. Walk-ins are accepted when space allows, but reservations are highly recommended because capacity is limited.']],
      menu: ['Creative American / upscale casual / wood-fired menu with starters, mains, wood-fired pizza, desserts, and drinks','Menu examples include wood wings, whipped ricotta toast, roasted cauliflower, oysters, red crab, prime ribeye, halibut, wood burger, duck breast, pasta, prosciutto and olive pizza, ricotta pizza, carbonara pizza, mushroom pizza, panna cotta, affogato, and ice cream','Open-kitchen, wood-fired format with local ingredient focus and a neighborhood fine-dining feel'],
      dietary: 'Ellinor says it can accommodate dietary restrictions and recommends asking the server about options or menu-item questions. Travelers with allergies should confirm details directly.',
      perDiem: 'Moderate to expensive. Ellinor can work under a dinner per diem if ordering carefully, especially with pizza or the wood burger. Spend can climb quickly with starters, seafood, steak, dessert, or drinks. Current menu examples include pizzas in the high teens to low twenties, the wood burger around the low twenties, and premium mains such as halibut, duck, seasonal pasta, and prime ribeye at higher price points.',
      useCases: [['Solo business dinner','4.2 / 5'],['Client dinner','4.5 / 5'],['Team dinner','3.6 / 5'],['Quick lunch','0.5 / 5 — dinner only'],['Quick dinner between meetings','2.4 / 5'],['After-work drinks','3.5 / 5'],['Special occasion while traveling','4.7 / 5'],['Budget / per-diem stretch','2.8 / 5']],
      busyRisk: 'Medium to high during prime dinner hours, especially Friday/Saturday. Reservation importance: high. Parking risk: medium because parking is street-only.',
      prompts: ['Did you have a reservation?','Was seating available for walk-ins?','Were you seated at the counter or a table?','Was it quiet enough for a business conversation?','Did the meal stay under your per diem?','Was street parking easy?','Would you bring a client here?','Was the experience worth the higher spend?'],
      tags: ['Creative American','Wood-Fired','Upscale Casual','Neighborhood Restaurant','Fine Dining','Business Dinner','Client Dinner','Dinner Only','Reservation Recommended','Resy','Local Ingredients','Open Kitchen','Pizza','Seafood','Steak','Date Night','Special Occasion','Local Favorite','Not Fast Food','Small Groups','Street Parking','Higher Per Diem','Dietary Accommodations','Takeout'],
      confidence: [['High confidence','Address, phone, hours, reservation method, walk-in policy, street parking, menu structure, and restaurant positioning'],['Needs in-app validation','Average ticket, wait time, noise level, Wi‑Fi, service speed, and real per-diem value']]
    }
  },
  'Fratellos Riverfront Restaurant': {
    verdict: 'A scenic Fox River pick for client lunch, client dinner, team meals, and after-work drinks — polished enough for business, but easy to overspend.',
    score: '4.4', count: 'App breakdown · high-confidence venue data', walk: 'Riverfront Appleton', airport: '11 min drive', best: 'Lunch or early dinner; reserve for prime times',
    quote: '“Scenic client-meal pick — watch premium entrées, seafood, steak, cocktails, and wine.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.3 / 5','good'],['Business Lunch Fit','4.5 / 5','good'],['Business Dinner Fit','4.7 / 5','good'],['Per Diem Value','3.0 / 5','okay'],['Speed / Quick Meal Fit','3.2 / 5','okay'],['Atmosphere','4.6 / 5','good'],['Client-Friendly','4.7 / 5','good'],['Solo Traveler Comfort','4.0 / 5','good'],['Group-Friendly','4.5 / 5','good'],['Dietary Flexibility','3.8 / 5','okay'],['After-Work Drinks','4.3 / 5','good']],
    details: {
      snapshot: 'Fratellos Riverfront Restaurant is an independently owned local Appleton restaurant with a casual-elegant waterfront feel, American and Italian menu range, full bar, patio/outdoor dining, private room options, and Fox River views.',
      businessSummary: 'Best positioned as a scenic client lunch, client dinner, team dinner, after-work drinks stop, or riverfront local experience. It is a stronger hosting pick than a quick budget meal.',
      contact: [['Address','501 W. Water Street, Appleton, WI 54911'],['Phone','920-993-9087'],['Hours','Open daily 11 AM–9 PM; bar open late. Lunch is commonly treated as 11 AM–4 PM and dinner as 4 PM–9 PM.'],['Reservations','Online reservations are available. RiverDome reservations are handled separately, and patio seating is not reservable during patio season.']],
      menu: ['American / Italian / waterfront casual-elegant menu with starters, salads, sandwiches, pizza, pasta, entrées, steak, seafood, cocktails, wine, beer, and full bar','Menu examples include bruschetta, Bam Bam shrimp, Wisconsin cheese curds, salmon arancini, pork belly, Wagyu meatballs, Caesar salad, chicken crunch salad, Fox Burger, short rib panini, pepperoni pizza, portobello mushroom ravioli, seafood Alfredo, short rib pasta, prime ribeye, tenderloin, and turbot','OpenTable-style attributes include bar/lounge, cocktails, full bar, patio/outdoor dining, private room, takeout, wine, gluten-free options, private lot parking, and Fox River views'],
      dietary: 'Gluten-free options are listed, but allergy handling and cross-contact details should be validated directly before relying on it for a client or group meal.',
      perDiem: 'Moderate to expensive. Fratellos can work for per diem if travelers choose sandwiches, pizza, salad, or one main dish. It becomes a higher-spend meal when appetizers, seafood, steak, cocktails, wine, or desserts are added.',
      useCases: [['Solo business lunch','4.0 / 5'],['Client lunch','4.5 / 5'],['Solo business dinner','4.2 / 5'],['Client dinner','4.7 / 5'],['Team dinner','4.5 / 5'],['Quick lunch between meetings','3.2 / 5'],['After-work drinks','4.3 / 5'],['Budget / per-diem stretch','3.0 / 5']],
      busyRisk: 'Medium to high during prime dinner, patio season, riverfront weather windows, and event nights. Reservation recommended for client meals and groups.',
      prompts: ['How long was the wait?','Did you have a reservation?','Was the riverfront seating available?','Was it quiet enough for a business conversation?','Did the meal stay under your per diem?','Was parking easy?','Would you bring a client here?','Did drinks or add-ons push the spend too high?'],
      tags: ['Riverfront','Waterfront Dining','American','Italian','Business Lunch','Client Dinner','Team Dinner','After-Work Drinks','Full Bar','Cocktails','Wine','Beer','Patio','Outdoor Dining','Fox River View','Private Room','Private Lot','Reservation Recommended','Open Daily','Local Favorite','Not Fast Food','Higher Per Diem','Gluten-Free Options','Takeout','Date Night','Special Occasion'],
      confidence: [['High confidence','Address, phone, daily hours, reservation availability, cuisine style, waterfront positioning, and major amenities'],['Needs in-app validation','Exact average ticket, current item pricing, patio availability, wait times, noise level, WiFi, service speed, and allergy handling']]
    }
  },
  'Stone Arch Brewpub': {
    verdict: 'A strong local brewpub value for beer, burgers, pizza, casual team meals, and per-diem-friendly lunches or dinners.',
    score: '4.2', count: 'App breakdown · high-confidence venue data', walk: 'South Appleton / Olde Oneida', airport: '12 min drive', best: 'Tue–Thu lunch or early dinner; check event nights',
    quote: '“Strong local brewpub value — great for beer, burgers, pizza, and casual team meals.”',
    author: 'Corporate Compass venue profile',
    metrics: [['Food Quality','4.1 / 5','good'],['Business Lunch Fit','4.3 / 5','good'],['Business Dinner Fit','4.3 / 5','good'],['Per Diem Value','4.1 / 5','good'],['Speed / Quick Meal Fit','3.7 / 5','okay'],['Atmosphere','4.1 / 5','good'],['Client-Friendly','3.6 / 5','okay'],['Solo Traveler Comfort','4.3 / 5','good'],['Group-Friendly','4.4 / 5','good'],['Dietary Flexibility','4.1 / 5','good'],['After-Work Drinks','4.6 / 5','good']],
    details: {
      snapshot: 'Stone Arch Brewpub is a local Appleton brewpub in one of Wisconsin’s oldest brewery settings, with craft beer, pub fare, family-friendly service, and ingredients sourced close to the brewery and kitchen when possible.',
      businessSummary: 'Best positioned as a per-diem-friendly local meal, casual team lunch, solo traveler dinner, coworker dinner, or after-work beer stop. It is more casual than a client-dinner showpiece, but very useful for work trips.',
      contact: [['Address','1004 S. Olde Oneida Street, Appleton, WI 54915'],['Phone','920-731-3322'],['Hours','Sun 11 AM–8 PM; Mon closed; Tue–Sat 11 AM–9 PM.'],['Reservations','The official brewpub page lists a reservation link and online ordering.']],
      menu: ['Brewpub / pub fare / American / craft beer menu with appetizers, salads, soups, burgers, sandwiches, pub favorites, seafood, pizza, cocktails, mocktails, wine, in-house sodas, non-alcoholic options, and craft beer','Menu examples include Scotch egg, spinach artichoke dip, fried pickles, cheese curds, Bavarian pretzel, Bang Bang shrimp, duck wontons, venison burger, short rib brisket burger, Mahi Mahi BLT, Impossible burger, black bean burger, smoked chicken pot pie, mac and beer cheese, flatbreads, vegetarian pasta primavera, shepherd’s pie, schnitzel, chicken cordon bleu, sirloin, ribeye, fish and chips, fish tacos, miso-glazed salmon, specialty pizzas, and build-your-own pizza','Taproom events such as live music and trivia should be tracked separately for crowding and noise'],
      dietary: 'Vegetarian and gluten-friendly menu paths are listed, with options such as Impossible burger, black bean burger, vegetarian pasta, gluten-friendly pizza sizing, dairy-free cheese, mocktails, non-alcoholic beer, and in-house sodas. Severe allergies should still be validated directly.',
      perDiem: 'Moderate / per-diem friendly. Stone Arch is more flexible than Fratellos, Rye, Apollon, or Ellinor. Travelers can control spend with burgers, sandwiches, pizza, pub favorites, salad, fish and chips, or tacos. Premium steak, salmon, appetizers, multiple beers, cocktails, or event-night extras can raise the ticket.',
      useCases: [['Solo business lunch','4.3 / 5'],['Casual client lunch','3.8 / 5'],['Solo business dinner','4.3 / 5'],['Casual client dinner','3.6 / 5'],['Team dinner','4.4 / 5'],['Quick lunch between meetings','3.7 / 5'],['After-work drinks','4.6 / 5'],['Budget / per-diem stretch','4.1 / 5']],
      busyRisk: 'Medium normally; medium to high on taproom event nights, live music nights, trivia nights, and weekend dinner periods. Noise can vary significantly by event calendar.',
      prompts: ['Was there a taproom event tonight?','Was it quiet enough for a business conversation?','Did the meal stay under your per diem?','Was service fast enough for lunch?','Were vegetarian or gluten-friendly options easy to order?','Would this work for a team dinner?','Was parking easy?','How loud was trivia or live music?'],
      tags: ['Brewpub','Craft Beer','Pub Fare','American','Business Lunch','Casual Dinner','After-Work Drinks','Team Dinner','Solo Traveler Friendly','Group Friendly','Per Diem Friendly','Lunch','Dinner','Open Sunday','Closed Monday','Reservations','Online Ordering','Local Favorite','Historic Brewery','Family Friendly','Vegetarian Options','Gluten-Friendly Options','Cocktails','Mocktails','Wine','In-House Soda','Non-Alcoholic Beer','Events','Trivia','Live Music','Not Fast Food'],
      confidence: [['High confidence','Address, phone, hours, reservation/online ordering availability, cuisine style, menu structure, dietary menu paths, and event-calendar note'],['Needs in-app validation','Average ticket, parking, noise level by event, wait times, WiFi, service speed, and allergy handling']]
    }
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
  'CopperLeaf Boutique Hotel': { score:96, loyalty:'Independent', metrics:[['Executive travel','5.0'],['Client meetings','5.0'],['Walkability','5.0'],['Dining','5.0'],['Workspace','4.4'],['Wi-Fi','4.4']], activity:{occupancy:'Relaxed', elevator:'No wait', frontDesk:'Under 2 min', breakfast:'Quiet', lobby:'Low noise'}, rooms:['King room','Executive suite','Spa stay room'], roomNote:'Premier boutique choice for executives, client-facing travelers, and anyone who values downtown walkability and direct access to Rye over loyalty points.', cost:{hotel:169, breakfast:14, lunch:18, dinner:42, uber:10}, favorites:[['Best dinner','Rye'],['Client dinner','Rye or Fratellos Riverfront'],['Coffee + work','Acoca Coffee'],['Hotel bar','Rye lounge'],['Gym','YMCA nearby'],['Remote work','CopperLeaf lobby']], tags:['Executive Travel','Client Entertainment','Boutique Luxury','Downtown Walkability'], airport:'12 min to ATW · easy ride-share · downtown base', event:'Best for executive and client-facing trips; not the top choice for loyalty-point maximizers.', bestFit:['Executives','Client entertainment','Business dinners','Couples extending business trips'], lessIdeal:['Travelers focused on maximizing hotel loyalty points','Large convention room blocks'], verifiedFacts:['Downtown district','Independent boutique hotel','Spa available','Restaurant: Rye','Excellent walkability'], community:['Noise by room/floor','Wi-Fi speed','Parking convenience','Service recovery','Business-dinner satisfaction'], aiSummary:'CopperLeaf Boutique Hotel & Spa is the premier boutique hotel in the Appleton Hub. It excels in executive-level accommodations, walkable downtown access, and direct connection to one of the area’s strongest business dining destinations.'},
  'Hilton Appleton Paper Valley': { score:95, loyalty:'Hilton Honors', metrics:[['Sleep Quality','4.1'],['Workspace','4.5'],['Wi-Fi','4.5'],['Business Amenities','5.0'],['Convention Access','5.0'],['Walkability','5.0']], activity:{occupancy:'Moderate', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Professional'}, rooms:['King room','Executive room','Convention stay room'], roomNote:'Flagship Appleton business hotel for conferences, client meetings, walkability, and travelers who want restaurants and venues close by.', cost:{hotel:149, breakfast:16, lunch:18, dinner:38, parking:15}, favorites:[['Best dinner','Rye'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Copper Rock Coffee'],['Hotel bar','Blaze Bourbon & Whiskey Bar'],['Convention access','Fox Cities Exhibition Center'],['Remote work','Lobby work tables']], tags:['Conference Attendees','Sales Travelers','Executives','Hilton Honors','Airport Shuttle'], airport:'~5 miles / 10–15 min to ATW · complimentary airport shuttle', event:'Connected to Fox Cities Exhibition Center; convention activity can increase lobby and elevator traffic.', bestFit:['Conference attendees','Sales travelers','Executives','Consultants','Overnight airport stays'], lessIdeal:['Long-term stays where a kitchen is important','Families where business location is not the priority'], verifiedFacts:['333 W. College Ave., Appleton, WI 54911','Connected to Fox Cities Exhibition Center','Complimentary airport shuttle','Covered paid self-parking','Check-in 4 PM / check-out 11 AM','Multiple dining venues'], community:['Average check-in time','Hilton Honors upgrade success','Late checkout approval','Breakfast satisfaction','Noise by floor','Elevator wait times'], aiSummary:'Hilton Appleton Paper Valley is the flagship business hotel in the Appleton Hub. Its convention connection, airport shuttle, multiple dining options, and walkable downtown location make it one of the strongest choices for conferences, client meetings, and corporate travelers.'},
  'DoubleTree by Hilton Appleton': { score:93, loyalty:'Hilton Honors', metrics:[['Sleep Quality','4.5'],['Workspace','4.6'],['Wi-Fi','4.5'],['Airport Convenience','5.0'],['Parking','5.0'],['Walkability','2.5']], activity:{occupancy:'Moderate', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Professional'}, rooms:['King room','Two queen room','Business traveler room'], roomNote:'Best for efficient airport-focused trips, rental-car travelers, sales reps, and one-night business stays where downtown walkability is less important.', cost:{hotel:139, breakfast:15, lunch:17, dinner:34, parking:0}, favorites:[['Best nearby dinner','Fox River Mall area dining'],['Client dinner','Downtown Appleton short drive'],['Coffee + work','Hotel lobby'],['Hotel bar','On-site bar/lounge'],['Airport','ATW in about 5 min'],['Remote work','Guest room desk']], tags:['Early Flights','Free Parking','Airport Shuttle','Hilton Honors','Rental Car Friendly'], airport:'~2–3 miles / about 5 min to ATW · complimentary airport shuttle', event:'Strong airport convenience; less ideal for a walkable downtown trip.', bestFit:['Early morning flights','Airline crews','Sales representatives','One-night business trips','Travelers with rental cars'], lessIdeal:['Walkable downtown experience','Travelers planning most meals on foot'], verifiedFacts:['150 S. Nicolet Road, Appleton, WI 54914','Airport / west business district','Complimentary self-parking','Complimentary airport shuttle','Check-in 3 PM / check-out 12 PM'], community:['Elite recognition','Upgrade success','Late checkout approval','Breakfast experience','Wi-Fi reliability'], aiSummary:'DoubleTree by Hilton Appleton is an excellent airport-focused business hotel with quick airport access, free parking, a free shuttle, and strong business amenities. It is best for travelers who value efficient logistics over downtown nightlife.'},
  'Residence Inn Appleton': { score:94, loyalty:'Marriott Bonvoy', metrics:[['Extended Stay','5.0'],['Workspace','4.8'],['Wi-Fi','4.6'],['Kitchen','5.0'],['Laundry','5.0'],['Airport Access','4.7']], activity:{occupancy:'Moderate', elevator:'No wait', frontDesk:'Under 3 min', breakfast:'Moderate', lobby:'Low noise'}, rooms:['Studio suite','One-bedroom suite','Extended-stay suite'], roomNote:'Strongest extended-stay option for travelers who need kitchens, room to work, laundry, and several nights of practical comfort.', cost:{hotel:139, breakfast:0, lunch:16, dinner:31, parking:0}, favorites:[['Best dinner','Stone Arch Brewpub'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Copper Rock Coffee'],['Quick lunch','Bowl 91'],['Long-stay supplies','Fox River Mall area'],['Remote work','Suite desk']], tags:['Extended Stay','Full Kitchens','Marriott Bonvoy','Free Breakfast','Project Teams'], airport:'~5 min to ATW · easy highway access', event:'Best for multi-night project work; not the strongest downtown nightlife base.', bestFit:['Consultants','Traveling nurses','Engineers','Long-term projects','Construction managers','Corporate relocations'], lessIdeal:['Executive client entertaining','Travelers who need walkable downtown restaurants'], verifiedFacts:['Airport business district','Marriott brand','Extended-stay hotel','Full kitchen in every suite','Complimentary breakfast','Free parking'], community:['Platinum upgrade success','Suite upgrade frequency','Breakfast quality','Elite recognition','Mobile key reliability'], aiSummary:'Residence Inn Appleton is the strongest extended-stay option in the Appleton Hub. Spacious suites, full kitchens, complimentary breakfast, and laundry make it ideal for consultants, project teams, and travelers working from the hotel between meetings.'},
  'Home2 Suites by Hilton Appleton': { score:94, loyalty:'Hilton Honors', metrics:[['Extended Stay','5.0'],['Workspace','4.8'],['Wi-Fi','4.6'],['Value','4.8'],['Airport Access','4.5'],['Business Amenities','4.4']], activity:{occupancy:'Moderate', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Casual'}, rooms:['Studio suite','One-bedroom suite','Kitchenette suite'], roomNote:'Excellent longer-stay Hilton option for practical business travelers who want breakfast, kitchenettes, and flexible suite space.', cost:{hotel:129, breakfast:0, lunch:16, dinner:31, parking:0}, favorites:[['Breakfast','Complimentary hotel breakfast'],['Lunch','Draft Gastropub'],['Dinner','Stone Arch Brewpub'],['Client dinner','Rye short drive'],['Coffee','Copper Rock Coffee'],['Remote work','Suite workspace']], tags:['Extended Stay','Kitchenettes','Free Breakfast','Hilton Honors','Project Teams'], airport:'~10 min to ATW · free parking', event:'Best for 3–14+ night assignments; less ideal for downtown meetings or client entertainment.', bestFit:['Consultants','Engineers','Medical professionals','Project teams','Training assignments','Travelers preparing simple meals'], lessIdeal:['Client entertainment','Walkable nightlife','Downtown meetings'], verifiedFacts:['Airport / north business district','Hilton brand','Kitchenettes in every suite','Complimentary breakfast','Complimentary parking','Pet friendly'], community:['Suite upgrade frequency','Elite recognition','Late checkout approval','Breakfast satisfaction','Digital Key reliability'], aiSummary:'Home2 Suites is an excellent choice for longer business stays. Complimentary breakfast, in-room kitchenettes, and spacious suites make it attractive for consultants, engineers, and project teams who want flexibility during extended assignments.'},
  'Cambria Hotel Appleton': { score:92, loyalty:'Choice Privileges', metrics:[['Workspace','4.7'],['Modern Amenities','4.8'],['Business Value','4.6'],['Wi-Fi','4.5'],['Airport Access','4.4'],['Client Meetings','4.2']], activity:{occupancy:'Relaxed', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Modern'}, rooms:['King room','Two queen room','Modern business room'], roomNote:'Modern upscale select-service option for short business trips, rental-car travelers, and people who prefer newer accommodations over downtown walkability.', cost:{hotel:129, breakfast:13, lunch:16, dinner:32, parking:0}, favorites:[['Nearby dining','Fox River Mall area'],['Dinner','Good Company'],['After-work','Stone Arch Brewpub'],['Client dinner','Draft Gastropub'],['Coffee','Hotel lobby'],['Remote work','Guest room desk']], tags:['Modern Rooms','Choice Privileges','On-site Bar','Free Parking','Short Trips'], airport:'~10 min to ATW · easy highway access', event:'Balances comfort and convenience; less ideal for convention attendees needing downtown walkability.', bestFit:['Sales travelers','One- to three-night trips','Modern accommodations','Travelers with rental cars'], lessIdeal:['Walkable downtown experience','Convention attendees'], verifiedFacts:['North Appleton district','Cambria Hotels / Choice Privileges','Upscale select-service hotel','On-site restaurant','Bar','Complimentary parking'], community:['Elite upgrades','Welcome amenity recognition','Late checkout experience','Wi-Fi reliability'], aiSummary:'Cambria Hotel Appleton is a modern, upscale option that balances comfort with convenience. It suits short business trips and travelers who prioritize newer accommodations and easy highway access over a downtown location.'},
  'Hilton Garden Inn Appleton/Kimberly': { score:91, loyalty:'Hilton Honors', metrics:[['Business Amenities','4.6'],['Workspace','4.6'],['Quietness','4.6'],['Parking','5.0'],['Team Travel','4.7'],['Airport','3.8']], activity:{occupancy:'Moderate', elevator:'Under 3 min', frontDesk:'3–5 min', breakfast:'Moderate', lobby:'Professional'}, rooms:['King room','Two queen room','Team travel room'], roomNote:'Practical Hilton option for travelers working in Kimberly, Kaukauna, manufacturing sites, or east Fox Cities business corridors.', cost:{hotel:129, breakfast:14, lunch:16, dinner:30, parking:0}, favorites:[['Best dinner','Mark’s East Side'],['Casual dinner','Stuc’s Pizza'],['Global option','Sai Ram Indian Cuisine'],['Group dinner','Antojitos Mexicanos'],['Coffee','Hotel lobby'],['Remote work','Guest room desk']], tags:['Manufacturing Visitors','Team Projects','Hilton Honors','Easy Parking','East Fox Cities'], airport:'~20 min to ATW · easiest with rental car', event:'Good east-side business base; not designed for downtown nightlife.', bestFit:['Manufacturing visitors','Kimberly/Kaukauna business travel','Team projects','Corporate training'], lessIdeal:['Downtown nightlife','Convention attendees based downtown'], verifiedFacts:['East Fox Cities district','Hilton Garden Inn brand','Hilton Honors','On-site restaurant','Bar','Complimentary parking'], community:['Quietness by floor','Breakfast satisfaction','Team check-in experience','Late checkout reliability'], aiSummary:'Hilton Garden Inn Appleton/Kimberly is a practical option for business travelers working in the eastern Fox Cities, combining Hilton Honors benefits with easy parking and convenient access to industrial and manufacturing employers.'},
  'Country Inn & Suites Appleton North': { score:89, loyalty:'Radisson Rewards Americas', metrics:[['Value','4.7'],['Breakfast','4.6'],['Workspace','4.3'],['Parking','5.0'],['Extended Stay','4.2'],['Client Meetings','2.8']], activity:{occupancy:'Relaxed', elevator:'No wait', frontDesk:'Under 3 min', breakfast:'Moderate', lobby:'Casual'}, rooms:['King room','Two queen room','Value business room'], roomNote:'Value-focused choice for road warriors, service technicians, and multi-day training travelers who want free breakfast and parking over luxury amenities.', cost:{hotel:109, breakfast:0, lunch:15, dinner:28, parking:0}, favorites:[['Casual dinner','Stuc’s Pizza'],['After-work','Stone Arch Brewpub'],['Client dinner','Mark’s East Side'],['Group dinner','Good Company'],['Coffee','Hotel breakfast / nearby cafés'],['Remote work','Guest room desk']], tags:['Best Value','Free Breakfast','Free Parking','Road Warriors','Radisson Rewards'], airport:'~20 min to ATW · best with rental car', event:'Budget-friendly north Fox Cities base; less ideal for executive client meetings.', bestFit:['Budget-conscious business travelers','Regional service technicians','Multi-day training','Road warriors'], lessIdeal:['Executive client meetings','Downtown nightlife'], verifiedFacts:['North Fox Cities district','Radisson brand','Complimentary breakfast','Complimentary parking','Midscale business hotel'], community:['Elite recognition','Upgrade frequency','Breakfast quality','Late checkout reliability','Noise level'], aiSummary:'Country Inn & Suites Appleton North provides solid value for business travelers who prioritize free parking, complimentary breakfast, and dependable accommodations over luxury amenities.'},
  'Courtyard Appleton Riverfront': { score:86, loyalty:'Marriott Bonvoy', metrics:[['Wi-Fi','9.1'],['Workspace','8.4'],['Quietness','8.6'],['Airport','8.3']], activity:{occupancy:'Relaxed', elevator:'No wait', frontDesk:'Under 3 min', breakfast:'Quiet', lobby:'Low noise'}, rooms:['King room','Executive suite','Long-stay room'], roomNote:'A streamlined Marriott option with efficient rooms, good workspace basics, convenient parking, and riverfront access.', cost:{hotel:139, breakfast:11, lunch:16, dinner:35, uber:12}, favorites:[['Best dinner','Carmella’s'],['Client dinner','Fratellos Riverfront'],['Coffee + work','Acoca Coffee'],['Hotel bar','Stone Arch Brewpub'],['Gym','On-site fitness center'],['Remote work','Lobby pods']], tags:['Marriott Bonvoy','Riverfront','Easy Parking','Quiet Work Base'], airport:'14 min to ATW · ride-share available · grab-and-go breakfast', event:'Typically quieter outside local event weekends.', bestFit:['Marriott travelers','Riverfront stays','Quiet work trips','Short Appleton visits'], lessIdeal:['Convention attendees needing direct downtown connection','Extended stays needing full kitchens'], verifiedFacts:['Riverfront district','Marriott Bonvoy','Business hotel','Easy parking'], community:['Room quietness','Wi-Fi speed','Breakfast value','Riverfront walkability'], aiSummary:'Courtyard Appleton Riverfront remains a reliable Marriott business base with efficient rooms, quieter surroundings, and useful riverfront access for travelers who do not need to be in the center of downtown.'},
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
let currentTripDate = new Date().toISOString().slice(0, 10);
let currentFilter = 'all';
let afterHoursCategory = null;
let pulseMode = 'social';
let checkedIn = false;
let checkinIntent = 'Open to connect';
const activeRefinements = new Set();
let selectedFoodType = null;
let selectedAtmosphere = null;
const travelerRoles = new Set(['Sales']);
const travelerProfile = {
  hotelProgram: 'Hilton Honors',
  airlineProgram: 'Delta SkyMiles',
  expenseTool: 'Concur',
  receiptPreference: 'Auto-save receipts',
  needs: new Set(['Client-ready dinners','Strong Wi-Fi','GSA per diem']),
  priorities: new Set(['Stay under policy','Host clients well'])
};
const privateReceipts = [
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Lupi & Iris', amount:52.00, file:'Receipt attached'},
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Colectivo on the Square', amount:14.80, file:'Receipt attached'},
  {trip:'Milwaukee Sales Visit · Aug 12–14', place:'Hotel Metro Lounge', amount:58.00, file:'Receipt attached'}
];
const verifiedReviews = [];
const placeGalleries = {};
let reviewSubmissionPlace = null;
let galleryUploadTarget = null;
let locationVerified = false;
let currentHotel = null;
let currentMapHotel = 'The Pfister Hotel';
const ratingCategories = ['Food Quality','Value for Per Diem','Client Meeting Friendly','Noise Level','Service Speed','Solo Dining Experience','Wi-Fi & Connectivity','Location & Convenience'];
let currentRatings = {};
const rewardProgress = { points:720, verifiedReviews:3, photoProofs:6, redeemed:[] };
const $ = s => document.querySelector(s);
const list = $('#placeList');
const gsaMealBreakdown = {
  68: {breakfast:16, lunch:19, dinner:28, incidental:5, firstLastDay:51},
  74: {breakfast:18, lunch:20, dinner:31, incidental:5, firstLastDay:55.5},
  80: {breakfast:20, lunch:22, dinner:33, incidental:5, firstLastDay:60},
  86: {breakfast:22, lunch:23, dinner:36, incidental:5, firstLastDay:64.5},
  92: {breakfast:23, lunch:26, dinner:38, incidental:5, firstLastDay:69}
};
const gsaFY2026Rates = {
  'Appleton, WI': {label:'Standard CONUS rate for Appleton, WI', county:'Outagamie County', mie:68, lodging:110, standard:true},
  'Milwaukee, WI': {label:'Milwaukee County, WI', county:'Milwaukee County', mie:80, lodging:140, standard:false},
  'Chicago, IL': {label:'Chicago, IL · Cook / Lake County', county:'Cook / Lake County', mie:92, standard:false, lodgingByMonth:{1:142,2:142,3:142,4:234,5:234,6:234,7:202,8:202,9:223,10:223,11:223,12:142}}
};
const afterHoursCategories = {
  drinks: {
    label:'Drinks & Nightlife', icon:'🍸',
    summary:'Cocktail bars, wine bars, whiskey bars, rooftops, breweries, speakeasies, hotel bars, piano bars, live music, and comedy.',
    ratings:['Atmosphere','Drink Quality','Service','Business Networking Friendly','Solo Traveler Friendly','Noise Level','Value','Location & Accessibility'],
    data:['Happy Hour','Dress Code','Live Music','Outdoor Seating','Reservations Recommended','Last Call','Walking Distance from Major Hotels','Private Meeting Areas']
  },
  golf: {
    label:'Golf', icon:'⛳',
    summary:'Public courses, resort courses, indoor simulators, driving ranges, Topgolf-style venues, and executive par-3 options.',
    ratings:['Course Conditions','Pace of Play','Staff & Service','Business Meeting Friendly','Rental Club Quality','Practice Facilities','Value','Overall Experience'],
    data:['Rental Clubs Available','Clubhouse Restaurant','Walking Allowed','Cart Included','Twilight Rates','Tee Time Availability','Executive Course','Corporate Event Friendly']
  },
  attractions: {
    label:'Local Attractions', icon:'🏙️',
    summary:'Museums, observation decks, waterfronts, public markets, historic districts, gardens, landmarks, and practical walking tours.',
    ratings:['Overall Experience','Time Required','Value','Accessibility','Business Traveler Friendly','Crowd Level','Walkability','Family Friendly'],
    data:['Average Visit Time','Indoor / Outdoor','Admission Price','Free Attraction','Evening Hours','Parking','Public Transit Access']
  },
  wellness: {
    label:'Fitness & Wellness', icon:'💪',
    summary:'Gyms, CrossFit boxes, yoga, Pilates, running trails, parks, massage, recovery centers, cryotherapy, sauna, and spa facilities.',
    ratings:['Equipment Quality','Cleanliness','Staff','Day Pass Value','Traveler Friendly','Shower Facilities','Crowd Level','Overall Experience'],
    data:['Day Pass Available','24 Hours','Locker Rooms','Towels Provided','Sauna','Cold Plunge','Parking','Hotel Partnerships']
  }
};

function categoryFor(place) {
  if (place.afterHoursCategory) return 'drinks';
  if (place.type.startsWith('Hotel')) return 'hotels';
  if (place.type.startsWith('Dinner')) return 'dinner';
  if (place.type.startsWith('Coffee')) return 'coffee';
  if (place.type.startsWith('After')) return 'drinks';
  return 'downtime';
}
function budgetClass(price) { return price <= budget ? 'perdiem' : price <= budget + 10 ? 'near' : 'over'; }
function budgetText(price) { return price <= budget ? `Within $${budget} per diem` : price <= budget + 10 ? `$${price-budget} over per diem` : `Over $${budget} per diem`; }
function fiscalYearFor(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
}
function gsaRateFor(city, dateString) {
  const rate = gsaFY2026Rates[city];
  if (!rate) return null;
  const date = new Date(`${dateString}T00:00:00`);
  const fy = fiscalYearFor(dateString);
  const month = date.getMonth() + 1;
  const lodging = rate.lodgingByMonth ? rate.lodgingByMonth[month] : rate.lodging;
  const meals = gsaMealBreakdown[rate.mie];
  return {...rate, fiscalYear:fy, month, lodging, meals};
}
function renderGovernmentRate() {
  const input = $('#tripDate');
  if (!input) return;
  if (!input.value) input.value = currentTripDate;
  const rate = gsaRateFor(currentCity, input.value);
  if (!rate || rate.fiscalYear !== 2026) {
    $('#gsaMieTotal').textContent = '—';
    $('#gsaDinnerRate').textContent = '—';
    $('#gsaLodgingRate').textContent = '—';
    $('#gsaRateNote').textContent = 'This prototype has FY2026 GSA rates loaded. Choose a date from Oct. 1, 2025 through Sept. 30, 2026.';
    $('#applyGovernmentRate').disabled = true;
    return;
  }
  $('#gsaMieTotal').textContent = `$${rate.mie}`;
  $('#gsaDinnerRate').textContent = `$${rate.meals.dinner}`;
  $('#gsaLodgingRate').textContent = `$${rate.lodging}`;
  $('#gsaRateNote').textContent = `FY${rate.fiscalYear} ${rate.label}. M&IE includes breakfast $${rate.meals.breakfast}, lunch $${rate.meals.lunch}, dinner $${rate.meals.dinner}, incidentals $${rate.meals.incidental}.`;
  $('#applyGovernmentRate').disabled = false;
}
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
function matchesFoodFilters(place) {
  if (!selectedFoodType && !selectedAtmosphere) return true;
  if (categoryFor(place) !== 'dinner') return false;
  const profile = foodProfiles[place.name];
  if (!profile) return false;
  return (!selectedFoodType || profile.type === selectedFoodType) && (!selectedAtmosphere || profile.atmosphere.includes(selectedAtmosphere));
}
function renderFoodBrowse() {
  const isDinner = currentFilter === 'dinner';
  $('#foodBrowse').hidden = !isDinner;
  if (!isDinner) return;
  document.querySelectorAll('[data-food]').forEach(button => {
    const active = button.dataset.food === selectedFoodType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-atmosphere]').forEach(button => {
    const active = button.dataset.atmosphere === selectedAtmosphere;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function matchesAfterHours(place) { return currentFilter !== 'drinks' || !afterHoursCategory || place.afterHoursCategory === afterHoursCategory; }
function logoMarkup(place) {
  const label = place.logoText || place.icon;
  const fallback = `<span class="place-logo-text">${label}</span>`;
  if (!place.logoSrc) return fallback;
  return `<img class="place-logo-img" src="${place.logoSrc}" alt="${place.name} logo" loading="lazy" onerror="this.remove()" />${fallback}`;
}
function renderPlaces() {
  const places = cityData[currentCity].places.filter(p => (currentFilter === 'all' || categoryFor(p) === currentFilter) && matchesRefinements(p) && matchesFoodFilters(p) && matchesAfterHours(p));
  list.innerHTML = places.map((p,i) => { const hotel = p.type.startsWith('Hotel'); return `<article class="place-card" data-place="${p.name}">
    <div class="place-image ${p.image} ${p.logoText ? 'has-logo' : ''}">${logoMarkup(p)}</div>
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
  renderGovernmentRate();
  renderFoodBrowse();
  renderPlaces();
  renderPulse();
  renderHotelMap();
}
function walkingScore(place) { return Math.round((place.ease * .55) + (place.safety * .45)); }
function walkingLabel(score) { return score >= 90 ? 'Excellent walk' : score >= 82 ? 'Easy walk' : score >= 72 ? 'Mixed route' : 'Ride-share better'; }
function mapQueryFor(hotelName) { return `${hotelName}, ${currentCity}`; }
function renderLiveMap(hotelName) {
  const query = mapQueryFor(hotelName);
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const fullUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  $('#liveMapHotel').textContent = hotelName;
  $('#liveMapFrame').src = embedUrl;
  $('#openLiveMap').href = fullUrl;
}
function hotelNamesForCurrentCity() { return cityData[currentCity].places.filter(place => place.type.startsWith('Hotel')).map(place => place.name); }
function fallbackMapPlan(hotelName) {
  const positions = [[62,34],[32,30],[72,52],[25,68],[58,75],[43,58]];
  const hotel = hotelProfiles[hotelName];
  const favoriteNames = (hotel?.favorites || []).map(favorite => favorite[1]).filter(Boolean);
  const nearby = favoriteNames.length ? favoriteNames : cityData[currentCity].places.filter(place => !place.type.startsWith('Hotel')).slice(0,5).map(place => place.name);
  return { x:50, y:50, approximate:true, places: nearby.slice(0,6).map((name,i) => ({name, distance:Number((0.4 + i * .35).toFixed(1)), minutes:8 + i * 5, ease:Math.max(70, 90 - i * 4), safety:Math.max(76, 92 - i * 3), x:positions[i % positions.length][0], y:positions[i % positions.length][1], approximate:true})) };
}
function renderHotelMap() {
  const cityMap = mapData[currentCity];
  const hotelNames = hotelNamesForCurrentCity();
  if (!hotelNames.includes(currentMapHotel)) currentMapHotel = hotelNames[0];
  const plan = cityMap.hotels[currentMapHotel] || fallbackMapPlan(currentMapHotel);
  const walkablePlaces = plan.places.filter(place => place.distance <= 1.5);
  const nearbyCount = walkablePlaces.length;
  const averageScore = walkablePlaces.length ? Math.round(walkablePlaces.reduce((total, place) => total + walkingScore(place), 0) / walkablePlaces.length) : 0;
  if ($('#mapHotelName')) $('#mapHotelName').textContent = currentMapHotel;
  $('#mapHotelSummary').textContent = `${nearbyCount} worthwhile places nearby · ${averageScore}/100 walking score`;
  $('#mapCityLabel').textContent = currentCity.split(',')[0].toUpperCase();
  $('#mapHotelSelect').innerHTML = hotelNames.map(name => `<option value="${name}" ${name === currentMapHotel ? 'selected' : ''}>${name} · ${hotelProfiles[name]?.loyalty || 'Independent'}</option>`).join('');
  $('#stayHotelSelect').innerHTML = hotelNames.map(name => `<option value="${name}" ${name === currentMapHotel ? 'selected' : ''}>${name}</option>`).join('');
  renderLiveMap(currentMapHotel);
  $('#walkabilityOverview').innerHTML = `<strong>${averageScore}</strong><div><b>Walking score from ${currentMapHotel}</b><span>Based on route ease + neighborhood safety for places within 1.5 miles.</span></div>`;
  const places = [...plan.places].sort((a,b) => a.distance - b.distance);
  $('#nearbyMapList').innerHTML = places.map(place => { const score = walkingScore(place); const caution = score < 82 ? 'caution' : ''; const descriptor = place.approximate ? `${place.distance.toFixed(1)} mi estimate · recommended nearby · safety ${place.safety}/100` : `${place.distance.toFixed(1)} mi · about ${place.minutes} min on foot · safety ${place.safety}/100`; return `<article class="map-result"><div><strong>${place.name}</strong><span>${descriptor}</span></div><div class="walk-score ${caution}"><b>${score}/100</b><small>${walkingLabel(score)}</small></div></article>`; }).join('');
}
function openHotelMap() { renderHotelMap(); $('#mapBackdrop').classList.add('open'); $('#mapBackdrop').setAttribute('aria-hidden','false'); }
function closeHotelMap() { $('#mapBackdrop').classList.remove('open'); $('#mapBackdrop').setAttribute('aria-hidden','true'); }
function roleText() { return [...travelerRoles].join(' + ') || 'business'; }
function profileListText(values, fallback = 'business travel') { const list = [...values]; return list.length ? list.slice(0, 3).join(' · ') : fallback; }
function syncProfileControls() {
  if (!$('#profileHotelProgram')) return;
  $('#profileHotelProgram').value = travelerProfile.hotelProgram;
  $('#profileAirlineProgram').value = travelerProfile.airlineProgram;
  $('#profileExpenseTool').value = travelerProfile.expenseTool;
  $('#profileReceiptPreference').value = travelerProfile.receiptPreference;
  document.querySelectorAll('[data-profile-chip]').forEach(button => button.classList.toggle('chosen', travelerProfile.needs.has(button.dataset.profileChip)));
  document.querySelectorAll('[data-priority]').forEach(button => button.classList.toggle('chosen', travelerProfile.priorities.has(button.dataset.priority)));
}
function renderProfileSummary() {
  const roles = roleText();
  const needs = profileListText(travelerProfile.needs, 'trip basics');
  $('#profileSummary').textContent = `✦ ${roles} · ${travelerProfile.hotelProgram}`;
  if ($('#profileCommandSummary')) $('#profileCommandSummary').textContent = `${roles} traveler · ${travelerProfile.hotelProgram} · ${travelerProfile.expenseTool}`;
  if ($('#profileCommandDetail')) $('#profileCommandDetail').textContent = `Watching for ${needs}. Receipts: ${travelerProfile.receiptPreference}.`;
  if ($('#profileOneStopSummary')) $('#profileOneStopSummary').textContent = `One-stop setup: hotels tuned to ${travelerProfile.hotelProgram}, dining tuned to ${profileListText(travelerProfile.priorities, 'your trip priorities')}, receipts routed for ${travelerProfile.expenseTool}.`;
  syncProfileControls();
}
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
function detailPairs(title, rows) { return `<section class="intel-section"><h3 class="review-section-title">${title}</h3><div class="intel-grid">${rows.map(row => `<div class="intel-card"><strong>${row[0]}</strong><span>${row[1]}</span></div>`).join('')}</div></section>`; }
function detailList(title, items) { return `<section class="intel-section"><h3 class="review-section-title">${title}</h3><ul class="intel-list">${items.map(item => `<li>${item}</li>`).join('')}</ul></section>`; }
function gallerySeed(placeName, kind='restaurant') {
  const base = kind === 'hotel' ? ['Lobby / arrival', 'Workspace setup', 'Room view'] : ['Dining room', 'Menu / receipt', 'Best dish'];
  return base.map(label => ({label, seed:true, author:'Photo prompt'}));
}
function renderPhotoGallery(placeName, kind='restaurant') {
  const photos = placeGalleries[placeName] || [];
  const tiles = photos.length ? photos : gallerySeed(placeName, kind);
  const count = photos.length;
  return `<section class="photo-gallery-section" data-gallery-section="${placeName}"><div class="gallery-heading"><div><h3>${kind === 'hotel' ? 'Traveler photo gallery' : 'Traveler photos'}</h3><span>${count ? `${count} traveler-submitted photo${count === 1 ? '' : 's'}` : 'No traveler photos yet — prompts shown below'}</span></div><button class="gallery-submit" data-gallery-place="${placeName}" data-gallery-kind="${kind}" type="button">Submit photo</button></div><div class="photo-gallery-grid">${tiles.map(photo => photo.src ? `<figure class="photo-tile"><img src="${photo.src}" alt="${photo.label || `${placeName} traveler photo`}" /><figcaption>${photo.label || 'Traveler photo'}<small>${photo.author || 'Traveler submitted'}</small></figcaption></figure>` : `<figure class="photo-tile empty"><div>${kind === 'hotel' ? '⌂' : '✦'}</div><figcaption>${photo.label}<small>${photo.author}</small></figcaption></figure>`).join('')}</div><p class="gallery-note">Photos are shown in this prototype session. In the live app, uploads would be verified, moderated, and tied to the traveler’s visit.</p></section>`;
}
function renderRestaurantDetails(review) {
  const details = review.details;
  if (!details) return '';
  return `<section class="intel-section"><h3 class="review-section-title">Restaurant snapshot</h3><p class="intel-copy">${details.snapshot}</p><p class="intel-copy">${details.businessSummary}</p></section>${detailPairs('Contact + operations', details.contact)}${detailList('Food + menu notes', details.menu)}<section class="intel-section warning"><h3 class="review-section-title">Dietary note</h3><p class="intel-copy">${details.dietary}</p></section><section class="intel-section perdiem-intel"><h3 class="review-section-title">Per diem meter</h3><p class="intel-copy">${details.perDiem}</p></section>${detailPairs('Best business traveler use cases', details.useCases)}<section class="intel-section"><h3 class="review-section-title">Check-in prompts</h3><p class="intel-copy"><b>Busy risk:</b> ${details.busyRisk}</p><div class="prompt-chips">${details.prompts.map(prompt => `<span>${prompt}</span>`).join('')}</div></section><section class="intel-section"><h3 class="review-section-title">App tags</h3><div class="intel-tags">${details.tags.map(tag => `<span>${tag}</span>`).join('')}</div></section>${detailPairs('Data confidence', details.confidence)}`;
}
function renderAfterHoursDetails(place) {
  const category = afterHoursCategories[place.afterHoursCategory];
  if (!category) return '';
  const crossCategory = ['Distance from downtown','Distance from airport','Nearby hotels','Parking availability','Walkable from major hotels','Typical cost per person','Business Traveler Score','Peak hours','Live check-in count','Good for client meetings','Good for networking','Good for solo travelers'];
  return `<section class="intel-section"><h3 class="review-section-title">${category.label} profile</h3><p class="intel-copy">${category.summary}</p></section><section class="intel-section"><h3 class="review-section-title">Rating categories</h3><div class="criteria-grid">${category.ratings.map((rating,i) => `<div class="criterion"><span class="criterion-label">${rating}</span><span class="criterion-value ${i < 4 ? 'good' : 'okay'}">${(4.8 - i * .12).toFixed(1)} / 5</span></div>`).join('')}</div></section><section class="intel-section"><h3 class="review-section-title">Data to collect</h3><div class="intel-tags">${category.data.map(item => `<span>${item}</span>`).join('')}</div></section><section class="intel-section perdiem-intel"><h3 class="review-section-title">Business-travel fields</h3><div class="intel-tags">${crossCategory.map(item => `<span>${item}</span>`).join('')}</div></section>`;
}
function openReview(place) {
  const review = restaurantReviews[place.name];
  if (!review && place.afterHoursCategory) {
    const category = afterHoursCategories[place.afterHoursCategory];
    $('#reviewContent').innerHTML = `<header class="review-hero"><p class="eyebrow">AFTER HOURS · ${category.label.toUpperCase()}</p><h2 id="reviewTitle">${place.name}</h2><p class="review-meta">${place.type} · Typical cost $${place.price}/person</p><p class="review-profile-context">Built for business travelers, not general nightlife browsing</p><div class="review-score-row"><span class="review-big-score">${place.score}</span><span class="review-score-copy">Business Traveler<br />Score</span></div></header><div class="review-body"><p class="review-verdict">${category.icon} ${place.name} is categorized under ${category.label}, with business-travel scoring focused on practicality, access, solo comfort, and company-money fit.</p><div class="review-detail-grid"><div class="review-detail"><strong>Nearby hotels</strong><span>Shown in map layer</span></div><div class="review-detail"><strong>Peak hours</strong><span>Needs traveler check-ins</span></div><div class="review-detail"><strong>Wi‑Fi</strong><span>Tracked where relevant</span></div></div>${renderPhotoGallery(place.name, 'restaurant')}${renderAfterHoursDetails(place)}<button class="review-submit" id="writeReview">Add after-hours intel · Earn 75 points</button><p class="review-note">Prototype after-hours category model. Real data would be collected from verified business travelers and current check-ins.</p></div>`;
    $('#reviewBackdrop').classList.add('open');
    $('#reviewBackdrop').setAttribute('aria-hidden','false');
    return;
  }
  if (!review) return;
  $('#reviewContent').innerHTML = `<header class="review-hero"><p class="eyebrow">BUSINESS TRAVELER REVIEW</p><h2 id="reviewTitle">${place.name}</h2><p class="review-meta">${place.type} · Avg. $${place.price}/person</p><p class="review-profile-context">Most relevant to ${roleText()} travelers</p><div class="review-score-row"><span class="review-big-score">${review.score}</span><span class="review-score-copy">Stretch Score<br />${review.count}</span></div></header><div class="review-body"><p class="review-verdict">${review.verdict}</p><div class="review-detail-grid"><div class="review-detail"><strong>${review.walk}</strong><span>from nearby hotels</span></div><div class="review-detail"><strong>${review.airport}</strong><span>from airport</span></div><div class="review-detail"><strong>${review.best}</strong><span>best arrival window</span></div></div>${renderPhotoGallery(place.name, 'restaurant')}<h3 class="review-section-title">Business traveler breakdown</h3><div class="criteria-grid">${review.metrics.map(m => `<div class="criterion"><span class="criterion-label">${m[0]}</span><span class="criterion-value ${m[2]}">${m[1]}</span></div>`).join('')}</div>${renderRestaurantDetails(review)}<blockquote class="review-quote">${review.quote}<strong>— ${review.author}<span class="reviewer-badge">✦ Trusted Traveler</span></strong></blockquote><button class="review-submit" id="writeReview">Add a verified review · Earn 75 points</button><p class="review-note">Sample prototype data. In the live app, these signals would be aggregated from verified business-traveler reviews.</p></div>`;
  $('#reviewBackdrop').classList.add('open');
  $('#reviewBackdrop').setAttribute('aria-hidden','false');
}
function closeReview() { $('#reviewBackdrop').classList.remove('open'); $('#reviewBackdrop').setAttribute('aria-hidden','true'); }
function hotelChips(title, items, tone='') {
  if (!items?.length) return '';
  return `<section class="hotel-section hotel-decision ${tone}"><h3>${title}</h3><div class="hotel-chip-grid">${items.map(item => `<span>${item}</span>`).join('')}</div></section>`;
}
function renderHotelDecisionSections(hotel) {
  if (!hotel.bestFit && !hotel.verifiedFacts && !hotel.aiSummary) return '';
  return `${hotelChips('Best fit for', hotel.bestFit, 'best-fit')}${hotelChips('Less ideal for', hotel.lessIdeal, 'less-ideal')}<section class="hotel-section"><h3>Verified facts</h3><div class="hotel-fact-list">${(hotel.verifiedFacts || []).map(fact => `<span>${fact}</span>`).join('')}</div></section><section class="hotel-section"><h3>Community intelligence to collect</h3><div class="hotel-fact-list community">${(hotel.community || []).map(signal => `<span>${signal}</span>`).join('')}</div></section>${hotel.aiSummary ? `<section class="hotel-section ai-insight"><h3>After Hours AI insight</h3><p class="hotel-note">${hotel.aiSummary}</p></section>` : ''}`;
}
function openHotel(place) {
  const hotel = hotelProfiles[place.name];
  if (!hotel) return;
  currentHotel = place;
  const total = Object.values(hotel.cost).reduce((sum,value) => sum + value, 0);
  $('#hotelContent').innerHTML = `<header class="hotel-hero"><p class="eyebrow">BUSINESS TRAVELER HOTEL</p><h2 id="hotelTitle">${place.name}</h2><p>${place.type} · From $${place.price}/night · ${hotel.loyalty}</p><div class="hotel-business-score"><strong>${hotel.score}/100</strong><span>Business Score<br />Would stay again on company money: <b>${hotel.stayVote || 'Absolutely'}</b></span></div></header><div class="hotel-body">${renderPhotoGallery(place.name, 'hotel')}<section class="hotel-section"><h3>Business score breakdown</h3><div class="hotel-metrics">${hotel.metrics.map(metric => `<div class="hotel-metric"><strong>${metric[1]}</strong><span>${metric[0]}</span></div>`).join('')}</div></section>${renderHotelDecisionSections(hotel)}<section class="hotel-section"><h3>Hotel check-in activity</h3><div class="hotel-activity"><div class="activity-top"><i class="activity-dot"></i><strong id="hotelOccupancy">${hotel.activity.occupancy}</strong><span>right now</span></div><div class="activity-grid"><span>Elevator: <b>${hotel.activity.elevator}</b></span><span>Front desk: <b>${hotel.activity.frontDesk}</b></span><span>Breakfast: <b>${hotel.activity.breakfast}</b></span><span>Lobby: <b>${hotel.activity.lobby}</b></span></div><button class="hotel-action" id="hotelActivityBtn">Share hotel activity</button><div id="hotelActivityOptions" class="hotel-tags" hidden><button class="hotel-tag" data-hotel-activity="Empty">Empty</button><button class="hotel-tag" data-hotel-activity="Moderate">Moderate</button><button class="hotel-tag" data-hotel-activity="Busy">Busy</button><button class="hotel-tag" data-hotel-activity="Packed">Packed</button><button class="hotel-tag" data-hotel-detail="elevator" data-value="5+ min">Elevator 5+ min</button><button class="hotel-tag" data-hotel-detail="frontDesk" data-value="10+ min">Front desk 10+ min</button><button class="hotel-tag" data-hotel-detail="breakfast" data-value="Packed">Breakfast packed</button><button class="hotel-tag" data-hotel-detail="lobby" data-value="Loud">Lobby loud</button></div></div></section><section class="hotel-section"><h3>Business traveler room reviews</h3><div class="room-tags">${hotel.rooms.map((room,i) => `<button class="room-tag ${i === 0 ? 'active' : ''}" data-room="${room}">${room}</button>`).join('')}</div><p class="hotel-note">${hotel.roomNote}</p></section><section class="hotel-section"><h3>Daily travel cost estimate</h3><div class="cost-card">${Object.entries(hotel.cost).map(([name,value]) => `<div class="cost-item"><strong>$${value}</strong><span>${name}</span></div>`).join('')}<div class="cost-total">Estimated total: $${total}/day</div></div></section><section class="hotel-section"><h3>Nearby business traveler favorites</h3><div class="nearby-favorites">${hotel.favorites.map(favorite => `<div class="nearby-favorite"><span>${favorite[0]}</span><strong>${favorite[1]}</strong></div>`).join('')}</div></section><section class="hotel-section"><h3>Hotel bar ranking</h3><div class="hotel-metrics"><div class="hotel-metric"><strong>8.9</strong><span>Networking</span></div><div class="hotel-metric"><strong>8.7</strong><span>Drink quality</span></div><div class="hotel-metric"><strong>8.4</strong><span>Quietness</span></div><div class="hotel-metric"><strong>9.1</strong><span>Professional vibe</span></div></div></section><section class="hotel-section"><h3>Airport + event intelligence</h3><p class="hotel-note"><b>Airport convenience:</b> ${hotel.airport}<br /><b>Event signal:</b> ${hotel.event}</p></section><section class="hotel-section"><h3>Would you stay here again on company money?</h3><div class="stay-vote"><button data-stay="Absolutely" class="${hotel.stayVote === 'Absolutely' || !hotel.stayVote ? 'selected' : ''}">👍 Absolutely</button><button data-stay="Only if required" class="${hotel.stayVote === 'Only if required' ? 'selected' : ''}">😐 If required</button><button data-stay="Never again" class="${hotel.stayVote === 'Never again' ? 'selected' : ''}">👎 Never again</button></div></section><div class="hotel-tags">${hotel.tags.map(tag => `<span class="hotel-tag">${tag}</span>`).join('')}<span class="hotel-tag">${hotel.loyalty}</span></div><p class="hotel-note">Sample prototype hotel intelligence. Real activity and verification would be based on current traveler check-ins and verified room stays.</p></div>`;
  $('#hotelBackdrop').classList.add('open');
  $('#hotelBackdrop').setAttribute('aria-hidden','false');
}
function closeHotel() { $('#hotelBackdrop').classList.remove('open'); $('#hotelBackdrop').setAttribute('aria-hidden','true'); }
function findPlaceByName(name) { return Object.values(cityData).flatMap(city => city.places).find(place => place.name === name); }
function addGalleryPhoto(file) {
  if (!galleryUploadTarget || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const placeName = galleryUploadTarget.place;
    if (!placeGalleries[placeName]) placeGalleries[placeName] = [];
    placeGalleries[placeName].unshift({src:reader.result, label:file.name, author:'Traveler submitted · pending verification'});
    const place = findPlaceByName(placeName);
    if (place) place.type.startsWith('Hotel') ? openHotel(place) : openReview(place);
    galleryUploadTarget = null;
    $('#galleryPhotoInput').value = '';
  };
  reader.readAsDataURL(file);
}
function renderRatingInputs() { $('#ratingInputs').innerHTML = ratingCategories.map(category => `<div class="rating-row"><span>${category}</span><div class="rating-stars">${[1,2,3,4,5].map(value => `<button class="rating-star ${currentRatings[category] >= value ? 'active' : ''}" type="button" data-category="${category}" data-value="${value}" aria-label="${category}: ${value} stars" aria-pressed="${currentRatings[category] === value}">★</button>`).join('')}</div></div>`).join(''); const values = Object.values(currentRatings).filter(Boolean); $('#travelerScore').textContent = values.length ? `${(values.reduce((sum,value) => sum + value, 0) / values.length).toFixed(1)} / 5` : '—'; }
function openReviewSubmission(place) { reviewSubmissionPlace = place; locationVerified = false; currentRatings = {}; $('#submissionPlace').textContent = place.name; $('#locationVerification').classList.remove('verified'); $('#locationVerificationText').textContent = 'Check that your location matches this place.'; $('#verifyLocation').textContent = 'Verify'; $('#reviewProofName').textContent = 'Add venue or food photo'; $('#submitReviewForm').reset(); renderRatingInputs(); $('#reviewSubmissionBackdrop').classList.add('open'); $('#reviewSubmissionBackdrop').setAttribute('aria-hidden','false'); }
function closeReviewSubmission() { $('#reviewSubmissionBackdrop').classList.remove('open'); $('#reviewSubmissionBackdrop').setAttribute('aria-hidden','true'); }
function openProfile() { renderProfileSummary(); $('#profileBackdrop').classList.add('open'); $('#profileBackdrop').setAttribute('aria-hidden','false'); }
function closeProfile() { $('#profileBackdrop').classList.remove('open'); $('#profileBackdrop').setAttribute('aria-hidden','true'); }
function openVault() { $('#vaultBackdrop').classList.add('open'); $('#vaultBackdrop').setAttribute('aria-hidden','false'); renderReceipts(); }
function closeVault() { $('#vaultBackdrop').classList.remove('open'); $('#vaultBackdrop').setAttribute('aria-hidden','true'); }
function openReceiptForm() { $('#receiptTripInput').value = $('#vaultTrip').value; $('#receiptBackdrop').classList.add('open'); $('#receiptBackdrop').setAttribute('aria-hidden','false'); }
function closeReceiptForm() { $('#receiptBackdrop').classList.remove('open'); $('#receiptBackdrop').setAttribute('aria-hidden','true'); }
function openBudget() { $('#modalBackdrop').classList.add('open'); $('#modalBackdrop').setAttribute('aria-hidden','false'); }
function showBudgetSettings() { $('#modalEyebrow').textContent = 'PER DIEM SETTINGS'; $('#modalTitle').textContent = 'Set your dinner budget'; $('#modalCopy').textContent = 'We’ll highlight places that make your expense report easy.'; $('#budgetOptions').style.display = 'grid'; $('#saveBudget').textContent = 'Save budget'; const matchingOption = document.querySelector(`#budgetOptions button[data-budget="${budget}"]`); document.querySelectorAll('#budgetOptions button').forEach(button => button.classList.toggle('chosen', button === matchingOption)); $('#customBudget').value = matchingOption ? '' : budget; $('#tripDate').value = currentTripDate; renderGovernmentRate(); openBudget(); }
function closeBudget() { $('#modalBackdrop').classList.remove('open'); $('#modalBackdrop').setAttribute('aria-hidden','true'); }
function renderAfterHoursPreview() {
  const category = afterHoursCategories[afterHoursCategory];
  if (!category) { $('#afterHoursCategoryPreview').innerHTML = '<p>Choose a category to see the business-traveler rating fields and data points we’ll track.</p>'; return; }
  $('#afterHoursCategoryPreview').innerHTML = `<div class="after-hours-preview-heading"><span>${category.icon}</span><div><strong>${category.label}</strong><small>${category.summary}</small></div></div><div class="after-hours-preview-grid"><div><b>Rating categories</b>${category.ratings.map(item => `<em>${item}</em>`).join('')}</div><div><b>Business-travel data</b>${category.data.map(item => `<em>${item}</em>`).join('')}</div></div>`;
}
function renderAfterHoursMode() { $('#afterHoursMode').hidden = !afterHoursCategory; if (afterHoursCategory) $('#afterHoursModeLabel').textContent = afterHoursCategories[afterHoursCategory].label; }
function openAfterHours() { $('#afterHoursBackdrop').classList.add('open'); $('#afterHoursBackdrop').setAttribute('aria-hidden','false'); $('#applyAfterHours').disabled = !afterHoursCategory; document.querySelectorAll('.after-hours-option').forEach(button => button.classList.toggle('chosen', button.dataset.afterHoursCategory === afterHoursCategory)); renderAfterHoursPreview(); }
function closeAfterHours() { $('#afterHoursBackdrop').classList.remove('open'); $('#afterHoursBackdrop').setAttribute('aria-hidden','true'); }

$('#cityButton').addEventListener('click', () => { $('#cityMenu').classList.toggle('open'); $('#cityButton').setAttribute('aria-expanded', $('#cityMenu').classList.contains('open')); });
document.querySelectorAll('#cityMenu button').forEach(button => button.addEventListener('click', () => { currentCity = button.dataset.city; $('#cityMenu').classList.remove('open'); renderCity(); }));
$('#openHotelMap').addEventListener('click', openHotelMap);
$('#closeMap').addEventListener('click', closeHotelMap);
$('#mapBackdrop').addEventListener('click', e => { if (e.target === $('#mapBackdrop')) closeHotelMap(); });
$('#mapHotelSelect').addEventListener('change', e => { currentMapHotel = e.target.value; renderHotelMap(); });
$('#stayHotelSelect').addEventListener('change', e => { currentMapHotel = e.target.value; renderHotelMap(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.filter.active').classList.remove('active'); button.classList.add('active'); currentFilter = button.dataset.filter; renderFoodBrowse(); if (currentFilter === 'drinks') { afterHoursCategory = null; renderAfterHoursMode(); openAfterHours(); } else { afterHoursCategory = null; renderAfterHoursMode(); renderPlaces(); } }));
$('#closeAfterHours').addEventListener('click', closeAfterHours);
$('#afterHoursBackdrop').addEventListener('click', e => { if (e.target === $('#afterHoursBackdrop')) closeAfterHours(); });
document.querySelectorAll('.after-hours-option').forEach(button => button.addEventListener('click', () => { afterHoursCategory = button.dataset.afterHoursCategory; document.querySelectorAll('.after-hours-option').forEach(option => option.classList.toggle('chosen', option === button)); $('#applyAfterHours').disabled = false; renderAfterHoursPreview(); }));
$('#applyAfterHours').addEventListener('click', () => { renderAfterHoursMode(); renderPlaces(); closeAfterHours(); });
$('#changeAfterHoursMode').addEventListener('click', openAfterHours);
$('#toggleReportFilters').addEventListener('click', () => { const filters = $('#reportFilters'); filters.hidden = !filters.hidden; $('#toggleReportFilters').setAttribute('aria-expanded', String(!filters.hidden)); });
document.querySelectorAll('.refine-filter').forEach(button => button.addEventListener('click', () => { const refinement = button.dataset.refine; if (activeRefinements.has(refinement)) { activeRefinements.delete(refinement); button.classList.remove('active'); button.setAttribute('aria-pressed','false'); } else { activeRefinements.add(refinement); button.classList.add('active'); button.setAttribute('aria-pressed','true'); } renderPlaces(); }));
$('#clearRefinements').addEventListener('click', () => { activeRefinements.clear(); document.querySelectorAll('.refine-filter.active').forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed','false'); }); renderPlaces(); });
document.querySelectorAll('[data-food]').forEach(button => button.addEventListener('click', () => { selectedFoodType = selectedFoodType === button.dataset.food ? null : button.dataset.food; renderFoodBrowse(); renderPlaces(); }));
document.querySelectorAll('[data-atmosphere]').forEach(button => button.addEventListener('click', () => { selectedAtmosphere = selectedAtmosphere === button.dataset.atmosphere ? null : button.dataset.atmosphere; renderFoodBrowse(); renderPlaces(); }));
$('#clearFoodFilters').addEventListener('click', () => { selectedFoodType = null; selectedAtmosphere = null; renderFoodBrowse(); renderPlaces(); });
document.querySelectorAll('.pulse-filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.pulse-filter.active').classList.remove('active'); button.classList.add('active'); pulseMode = button.dataset.pulse; renderPulse(); }));
list.addEventListener('click', e => { if (e.target.matches('[data-save]')) { e.target.classList.toggle('saved'); e.target.textContent = e.target.classList.contains('saved') ? '♥' : '♡'; return; } const card = e.target.closest('.place-card'); if (!card) return; const place = cityData[currentCity].places.find(p => p.name === card.dataset.place); if (!place) return; if (place.type.startsWith('Hotel')) openHotel(place); else openReview(place); });
$('#closeReview').addEventListener('click', closeReview);
$('#reviewBackdrop').addEventListener('click', e => { if (e.target === $('#reviewBackdrop')) closeReview(); });
$('#closeHotel').addEventListener('click', closeHotel);
$('#hotelBackdrop').addEventListener('click', e => { if (e.target === $('#hotelBackdrop')) closeHotel(); });
$('#hotelContent').addEventListener('click', e => { const activity = e.target.closest('[data-hotel-activity]'); const detail = e.target.closest('[data-hotel-detail]'); const stay = e.target.closest('[data-stay]'); if (e.target.id === 'hotelActivityBtn') { $('#hotelActivityOptions').hidden = false; e.target.classList.add('active'); e.target.textContent = 'Choose what you’re seeing'; } if (activity && currentHotel) { hotelProfiles[currentHotel.name].activity.occupancy = activity.dataset.hotelActivity; openHotel(currentHotel); } if (detail && currentHotel) { hotelProfiles[currentHotel.name].activity[detail.dataset.hotelDetail] = detail.dataset.value; openHotel(currentHotel); } if (stay && currentHotel) { hotelProfiles[currentHotel.name].stayVote = stay.dataset.stay; openHotel(currentHotel); } });
$('#reviewContent').addEventListener('click', e => { if (e.target.id === 'writeReview') { const place = cityData[currentCity].places.find(p => p.name === $('#reviewTitle').textContent); if (place) openReviewSubmission(place); } });
document.addEventListener('click', e => { const button = e.target.closest('[data-gallery-place]'); if (!button) return; galleryUploadTarget = {place:button.dataset.galleryPlace, kind:button.dataset.galleryKind}; $('#galleryPhotoInput').click(); });
$('#galleryPhotoInput').addEventListener('change', e => addGalleryPhoto(e.target.files[0]));
$('#closeReviewSubmission').addEventListener('click', closeReviewSubmission);
$('#reviewSubmissionBackdrop').addEventListener('click', e => { if (e.target === $('#reviewSubmissionBackdrop')) closeReviewSubmission(); });
$('#verifyLocation').addEventListener('click', () => { locationVerified = true; $('#locationVerification').classList.add('verified'); $('#locationVerificationText').textContent = 'Location match confirmed for this prototype.'; $('#verifyLocation').textContent = 'Verified ✓'; });
$('#reviewProof').addEventListener('change', e => { $('#reviewProofName').textContent = e.target.files[0] ? e.target.files[0].name : 'Add venue or food photo'; });
$('#ratingInputs').addEventListener('click', e => { const star = e.target.closest('.rating-star'); if (!star) return; currentRatings[star.dataset.category] = Number(star.dataset.value); renderRatingInputs(); });
$('#submitReviewForm').addEventListener('submit', e => { e.preventDefault(); const ratingsComplete = ratingCategories.every(category => currentRatings[category]); if (!locationVerified || !$('#reviewProof').files[0] || !ratingsComplete || !reviewSubmissionPlace) { $('#locationVerificationText').textContent = !locationVerified ? 'Verify your location to submit a Verified review.' : !$('#reviewProof').files[0] ? 'Add a photo of the venue or food to earn the Verified badge.' : 'Rate all eight work-travel categories to submit.'; return; } const score = Object.values(currentRatings).reduce((sum,value) => sum + value, 0) / ratingCategories.length; verifiedReviews.push({ place:reviewSubmissionPlace.name, proof:$('#reviewProof').files[0].name, ratings:{...currentRatings}, score, text:$('#reviewText').value.trim() || null }); addContributionRewards(); $('#reviewText').value = ''; closeReviewSubmission(); closeReview(); });
$('#profileSummary').addEventListener('click', openProfile);
$('#closeProfile').addEventListener('click', closeProfile);
$('#profileBackdrop').addEventListener('click', e => { if (e.target === $('#profileBackdrop')) closeProfile(); });
document.querySelectorAll('.profile-role').forEach(button => button.addEventListener('click', () => { const role = button.dataset.role; if (travelerRoles.has(role)) { travelerRoles.delete(role); button.classList.remove('chosen'); } else { travelerRoles.add(role); button.classList.add('chosen'); } renderProfileSummary(); }));
document.querySelectorAll('[data-profile-chip]').forEach(button => button.addEventListener('click', () => { const need = button.dataset.profileChip; travelerProfile.needs.has(need) ? travelerProfile.needs.delete(need) : travelerProfile.needs.add(need); renderProfileSummary(); }));
document.querySelectorAll('[data-priority]').forEach(button => button.addEventListener('click', () => { const priority = button.dataset.priority; travelerProfile.priorities.has(priority) ? travelerProfile.priorities.delete(priority) : travelerProfile.priorities.add(priority); renderProfileSummary(); }));
['HotelProgram','AirlineProgram','ExpenseTool','ReceiptPreference'].forEach(field => { const control = $(`#profile${field}`); if (control) control.addEventListener('change', e => { const key = field.charAt(0).toLowerCase() + field.slice(1); travelerProfile[key] = e.target.value; renderProfileSummary(); }); });
$('#profileVaultShortcut').addEventListener('click', () => { closeProfile(); openVault(); });
$('#profileBudgetShortcut').addEventListener('click', () => { closeProfile(); showBudgetSettings(); });
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
document.querySelectorAll('#budgetOptions button').forEach(button => button.addEventListener('click', () => { const chosen = document.querySelector('#budgetOptions .chosen'); if (chosen) chosen.classList.remove('chosen'); button.classList.add('chosen'); $('#customBudget').value = ''; budget = Number(button.dataset.budget); }));
$('#customBudget').addEventListener('input', e => { if (e.target.value) { const chosen = document.querySelector('#budgetOptions .chosen'); if (chosen) chosen.classList.remove('chosen'); } });
$('#tripDate').addEventListener('change', e => { currentTripDate = e.target.value || currentTripDate; renderGovernmentRate(); });
$('#applyGovernmentRate').addEventListener('click', () => { const rate = gsaRateFor(currentCity, $('#tripDate').value); if (!rate || rate.fiscalYear !== 2026) return; const chosen = document.querySelector('#budgetOptions .chosen'); if (chosen) chosen.classList.remove('chosen'); $('#customBudget').value = ''; budget = rate.meals.dinner; $('#perDiemValue').textContent = `$${budget}`; closeBudget(); renderPlaces(); });
$('#saveBudget').addEventListener('click', () => { const customBudget = Number($('#customBudget').value); if (customBudget > 0) budget = Math.round(customBudget); $('#perDiemValue').textContent = `$${budget}`; closeBudget(); renderPlaces(); });
function openCheckin() { $('#checkinPlace').textContent = cityData[currentCity].live[0]; $('#checkinBackdrop').classList.add('open'); $('#checkinBackdrop').setAttribute('aria-hidden','false'); }
function closeCheckin() { $('#checkinBackdrop').classList.remove('open'); $('#checkinBackdrop').setAttribute('aria-hidden','true'); }
$('#checkInButton').addEventListener('click', openCheckin);
$('#closeCheckin').addEventListener('click', closeCheckin);
$('#checkinBackdrop').addEventListener('click', e => { if (e.target === $('#checkinBackdrop')) closeCheckin(); });
document.querySelectorAll('#intentOptions button').forEach(button => button.addEventListener('click', () => { document.querySelector('#intentOptions .chosen').classList.remove('chosen'); button.classList.add('chosen'); checkinIntent = button.dataset.intent; }));
$('#confirmCheckin').addEventListener('click', () => { if (checkedIn) return; const destination = cityData[currentCity].pulse[0]; destination.count += 1; if (checkinIntent === 'Open to connect') destination.open += 1; cityData[currentCity].live[1] = `You + ${destination.count - 1} business travelers checked in this hour`; $('#checkInButton').textContent = 'Live for 60 min'; $('#checkInButton').disabled = true; checkedIn = true; closeCheckin(); renderCity(); });
function openPlaceRequest() { $('#placeRequestBackdrop').classList.add('open'); $('#placeRequestBackdrop').setAttribute('aria-hidden','false'); }
function closePlaceRequest() { $('#placeRequestBackdrop').classList.remove('open'); $('#placeRequestBackdrop').setAttribute('aria-hidden','true'); }
$('#addPlace').addEventListener('click', openPlaceRequest);
$('#closePlaceRequest').addEventListener('click', closePlaceRequest);
$('#placeRequestBackdrop').addEventListener('click', e => { if (e.target === $('#placeRequestBackdrop')) closePlaceRequest(); });
$('#requestProof').addEventListener('change', e => { $('#requestProofName').textContent = e.target.files[0] ? e.target.files[0].name : 'Add a photo or receipt'; });
$('#placeRequestForm').addEventListener('submit', e => { e.preventDefault(); const name = $('#requestPlaceName').value.trim(); const reason = $('#requestReason').value.trim(); const excluded = /fast food|gas station|convenience store/i.test(`${name} ${reason}`); $('#placeRequestStatus').textContent = excluded ? 'This request needs a closer review because it may fall outside Corporate Compass’s business-travel focus.' : `Request received for ${name}. We’ll check duplicates, verify the business is active, and review its business-travel fit before publishing.`; if (!excluded) { rewardProgress.points += 10; renderRewards(); } $('#placeRequestForm').reset(); $('#requestProofName').textContent = 'Add a photo or receipt'; });
document.querySelectorAll('.nav-item:not(.fab)').forEach(b => b.addEventListener('click', () => { document.querySelector('.nav-item.selected').classList.remove('selected'); b.classList.add('selected'); if (b.dataset.nav === 'profile') openProfile(); if (b.dataset.nav === 'trips') openVault(); }));
$('#viewAll').addEventListener('click', () => { document.querySelector('[data-filter="all"]').click(); list.scrollIntoView({behavior:'smooth',block:'start'}); });
renderCity();
renderProfileSummary();
renderRewards();
