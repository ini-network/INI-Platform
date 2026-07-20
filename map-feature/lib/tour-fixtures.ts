// Frozen demo data for the guided tour. A ONE-TIME snapshot from staging
// (CIVIC_SIGNAL_API_BASE_URL) captured 2026-07-15:
//   GET /news?limit=5&lookback_days=30   → TOUR_NEWS
//   GET /pulse/reports?limit=3           → TOUR_REPORTS
// Pure module constants — no fetch, no Date.now(). Rendered ONLY when a surface
// is in tour mode (?tour=1 pages / tourOpen digest), always alongside an
// "Example content for this tour" honesty note, and inert (non-navigating)
// while the tour runs. To refresh, re-run the two GETs and paste the results.

import type { NewsListItem } from "./news";
import type { ReportItem } from "./report-types";
import type { NeighborhoodSignal } from "./signal-types";

export const TOUR_NEWS: NewsListItem[] = [
  {
    id: 4025382,
    title: "Authorities warn Midtown tower could collapse after beams buckle during conversion",
    summary:
      "Emergency responders arrived Tuesday morning after a call reported bricks falling from the 38-story former Pfizer headquarters on East 42nd Street between Second and Third avenues.",
    image_url:
      "https://api-prod.gothamist.com/images/358013/fill-1200x650|format-webp|webpquality-85/",
    source_url:
      "https://gothamist.com/news/fdny-evacuates-midtown-tower-undergoing-residential-conversion",
    outlet: "Gothamist",
    published_at: "2026-07-07T16:18:00Z",
    borough: "Manhattan",
    category: null,
    category_label: null
  },
  {
    id: 4025375,
    title: "Construction on hold for Sunnyside mixed-use building with 99 units",
    summary:
      "Construction has been put on hold for an 8-story mixed-use building with 99 housing units at 43-42 43rd St. in Sunnyside. A new completion timeline has not yet been given.",
    image_url:
      "https://qns.com/wp-content/uploads/2026/07/Screenshot-2026-07-07-110239.jpg?quality=51&w=1136&p=q",
    source_url: "https://qns.com/2026/07/construction-on-hold-sunnyside-mixed-use-99-units/",
    outlet: "QNS",
    published_at: "2026-07-07T15:30:13Z",
    borough: "Queens",
    category: "housing_and_buildings",
    category_label: "Housing"
  },
  {
    id: 4025374,
    title:
      "From retail to rooftop: Williamsburg’s former Urban Outfitters building set for luxury private club",
    summary:
      "A luxury watchmaker and the group behind the “world’s first NFT restaurant” are bringing a members-only club to a multi-floor space on North 6th St. in Williamsburg.",
    image_url:
      "https://www.brooklynpaper.com/wp-content/uploads/2026/07/IMG_8876.jpeg?quality=51&w=1200&p=q",
    source_url:
      "https://www.brooklynpaper.com/williamsburg-former-urban-outfitters-luxury-private-club/",
    outlet: "Brooklyn Paper",
    published_at: "2026-07-07T14:49:32Z",
    borough: "Brooklyn",
    category: null,
    category_label: null
  },
  {
    id: 4025379,
    title: "Bronx-born filmmaker Wilfred La Salle shooting new film in the borough about autism awareness",
    summary:
      "Bronx-born filmmaker Wilfred La Salle is shooting his eighth original film, “Lucy,” with interior scenes at a house on Mosholu Parkway, telling a story that highlights autism awareness.",
    image_url:
      "https://www.bxtimes.com/wp-content/uploads/2026/07/IMG_5668.jpeg?quality=51&w=1200&p=q",
    source_url: "https://www.bxtimes.com/wilfred-la-salle-shooting-film-autism-awareness/",
    outlet: "Bronx Times",
    published_at: "2026-07-07T14:46:51Z",
    borough: "Bronx",
    category: "public_safety_and_emergency_response",
    category_label: "Public Safety"
  },
  {
    id: 4025368,
    title: "Midtown NYC building evacuated after support beams buckle, floors cave",
    summary:
      "A Midtown NYC high-rise was evacuated Tuesday morning after massive beams inside the under-construction building started buckling — sending some floors caving in and bricks raining down.",
    image_url:
      "https://nypost.com/wp-content/uploads/sites/2/2026/07/nyc-building-column-collapse-comp-1.jpg?quality=75&strip=all&w=1200",
    source_url:
      "https://nypost.com/2026/07/07/us-news/nyc-building-evacuated-after-support-beams-buckle-floors-cave/",
    outlet: "New York Post",
    published_at: "2026-07-07T14:46:20Z",
    borough: "Manhattan",
    category: null,
    category_label: null
  }
];

// The vetted /pulse/reports cards carried no comments at snapshot time (comments
// live on needs-review cards), but the tour must SHOW the comment experience —
// so each story carries real resident comments (verbatim redacted_text pulled
// from item_comments on staging, 2026-07-15), paired by topic. The pages label
// everything "Example content for this tour", so the pairing is honest demo
// composition, not a claim these comments were left on these exact posts.
export const TOUR_REPORTS: ReportItem[] = [
  {
    card_id: 1109,
    title: "Good morning.",
    summary:
      "Here is your neighbor on Burke and Holland Avenue. I wanted to share this image of a man who tried to open my neighbor's door the other day. Please make sure you lock your doors. This is scary.",
    category: "public_space_and_quality_of_life",
    area_id: 183,
    area: "Williamsbridge-Olinville",
    borough: "Bronx",
    area_type: "nta",
    last_seen: "2026-07-10T12:07:08.214000Z",
    posts: [
      {
        title: "Good morning.",
        excerpt:
          "Here is your neighbor on Burke and Holland Avenue. I wanted to share this image of a man who tried to open my neighbor's door the other day. I don't know if he is in the neighborhood trying to open random doors. Please make sure you lock your doors. This is scary. In the video, he appears to be trying to open the door, and when it doesn't open, he leaves rapidly",
        body:
          "Here is your neighbor on Burke and Holland Avenue. I wanted to share this image of a man who tried to open my neighbor's door the other day. I don't know if he is in the neighborhood trying to open random doors. Please make sure you lock your doors. This is scary. In the video, he appears to be trying to open the door, and when it doesn't open, he leaves rapidly",
        url: "https://nextdoor.com/p/4NhJ5Y4Yyp5N",
        platform: "nextdoor",
        published_at: "2026-07-10T12:07:08.214000Z",
        comments: [
          {
            text: "How sad! I hope the police pursue this !!!!",
            score: 18,
            published_at: "2026-06-24T13:00:36.950000Z"
          },
          {
            text: "Call your City Council person, Community Board, and the mayors office at 311...say you want to leave a message for the mayor. Go to local police precinct meetings. Do this at least once a month.",
            score: 6,
            published_at: "2026-07-02T00:13:03.180000Z"
          }
        ]
      }
    ]
  },
  {
    card_id: 1107,
    title: "251 Douglass St - Gowanus Wharf",
    summary:
      "Horrific experience moving into a new building that I think anyone looking at the building should know about. Two weeks in there is no hot water, the stove wasn't working when we moved in, and the bathroom just flooded.",
    category: "housing_and_buildings",
    area_id: 92,
    area: "Carroll Gardens-Cobble Hill-Gowanus-Red Hook",
    borough: "Brooklyn",
    area_type: "nta",
    last_seen: "2026-07-10T11:35:48Z",
    posts: [
      {
        title: "251 Douglass St - Gowanus Wharf",
        excerpt:
          "Horrific experience moving into a new building that I think anyone looking at the building should know about. We just moved into an apartment at Gowanus Wharf - 251 Douglass St and two weeks in there is no hot water, the stove wasn't working when we moved in, the bathroom just flooded after one of the handymen worked on it, the noise in the building is unbearable since there is construction going on with no end in sight, and I can keep going.",
        body:
          "Horrific experience moving into a new building that I think anyone looking at the building should know about. We just moved into an apartment at Gowanus Wharf - 251 Douglass St and two weeks in there is no hot water, the stove wasn't working when we moved in, the bathroom just flooded after one of the handymen worked on it, the noise in the building is unbearable since there is construction going on with no end in sight, and I can keep going. The mgmt company lied repeatedly before we signed lease, about work being done, about them adding more than 1 climate zone in a 3 bedroom apt which they did not, and many other things. I am filing complaints with the city but not sure they will do anything and just hoping I can get out of this lease and get somewhere reasonable. A huge WARNING to anyone looking at any Charney building. I would never in my life consider renting from them ever again.",
        url: "https://www.reddit.com/r/NYCapartments/comments/1usl3sw/251_douglass_st_gowanus_wharf/",
        platform: "reddit",
        published_at: "2026-07-10T11:35:48Z",
        comments: [
          {
            text: "If there hasn't been a legal proceeding, the landlord can't just post an eviction notice. I'm sorry that you have to endure this.",
            score: 11,
            published_at: "2026-06-29T18:01:00.316000Z"
          },
          {
            text: "Ridiculous. Thanks for the heads up. At first, restaurants were using the Covid excuse. Now things are really getting out of hand",
            score: 14,
            published_at: "2026-06-24T20:57:17.107000Z"
          }
        ]
      }
    ]
  },
  {
    card_id: 1069,
    title: "Smoke alarm at the old Berg’n and firemen swarming in, this building refuses to just go already",
    summary:
      "Berg'n has been empty for years, basically since COVID. Just now there was a smoke alarm going off with firefighters trying to get inside. Turns out it's been up for sale since January.",
    category: "public_space_and_quality_of_life",
    area_id: 99,
    area: "Crown Heights (North)",
    borough: "Brooklyn",
    area_type: "nta",
    last_seen: "2026-07-10T02:44:44Z",
    posts: [
      {
        title:
          "Smoke alarm at the old Berg’n and firemen swarming in, this building refuses to just go already",
        excerpt:
          "Berg'n's been empty for years now, basically since COVID. A couple months back they brought in a bunch of equipment (HVAC, insulation, tiles) so I figured something was finally happening… nope, empty again. And just now there was a smoke alarm going off with firefighters trying to get inside. Turns out it's actually been up for sale since January.",
        body:
          "Berg'n's been empty for years now, basically since COVID. A couple months back they brought in a bunch of equipment (HVAC, insulation, tiles) so I figured something was finally happening… nope, empty again. And just now there was a smoke alarm going off with firefighters trying to get inside. Turns out it's actually been up for sale since January (TerraCRG has it listed as two empty units, ~14k sq ft total). Anyone know who's looking at it or what's going in there? Would love to see a brewery, food hall, whatever, or honestly just knock it down and put housing there. Anything beats letting it rot. I looked it up and the catch is it's zoned industrial (M1-1), so technically no apartments allowed by default. But the whole block is inside that new Atlantic Ave Mixed-Use rezoning (AAMUP), which is basically the city opening the area up for housing. So residential there isn't crazy, it's just not automatic. Either way, someone please do something with it before it's fully rats lol.",
        url: "https://www.reddit.com/r/crownheights/comments/1usb6q7/smoke_alarm_at_the_old_bergn_and_firemen_swarming/",
        platform: "reddit",
        published_at: "2026-07-10T02:44:44Z",
        comments: [
          {
            text: "How do you think the restoration of the 'Burg Industrial Build will change the vibe of the neighborhood?",
            score: 0,
            published_at: "2026-07-02T13:49:29.713000Z"
          }
        ]
      }
    ]
  }
];

// Six hand-picked Brooklyn signal rows (verbatim, no edits) for the tour's
// level-2 (top signals) and level-3 (area cards) panel demos. Chosen for a
// truthful spread: strong resident voices (48, 29, 169, 44, 64), a
// 311-dominated row (306: 1 post vs 182 complaints), a new-or-growing trend
// (169), non-empty complaint types (48, 29, 306, 44, 64), and a news-carrying
// row (64, news_items=5) so the resident-quote gate (news_items===0) is
// exercised on screen. Rendered ONLY while tourOpen, with the "Example content
// for this tour" note; the cards never navigate.
export const TOUR_SIGNALS: NeighborhoodSignal[] = [
  {
    id: 48,
    area_id: 103,
    area: "Bay Ridge",
    borough: "Brooklyn",
    area_type: "nta",
    signal_type: "public_services",
    category: "streets_sidewalks_and_transportation",
    trend: "steady",
    headline: "Multiple residents are discussing street and transit issues in Bay Ridge",
    community_posts: 4,
    reports_311: 130,
    news_items: 0,
    approved_cards: 2,
    top_complaint_types: ["Illegal Parking", "Traffic Signal Condition", "Blocked Driveway"],
    top_titles: ["Downed tree blocking Bayridge Parkway between 4th and 5th Ave", "Fallen tree on Bay Ridge Pkwy-75th Ave Between 4th & 5th.", "Everytime I walk by the oh so necessary “protected bike lane” on Court Street…"],
    score: 152.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  },
  {
    id: 29,
    area_id: 89,
    area: "Spring Creek-Starrett City",
    borough: "Brooklyn",
    area_type: "nta",
    signal_type: "community_concerns",
    category: "housing_and_buildings",
    trend: "steady",
    headline: "Multiple residents are discussing heat and hot water problems in Spring Creek-Starrett City",
    community_posts: 6,
    reports_311: 32,
    news_items: 0,
    approved_cards: 6,
    top_complaint_types: ["PLUMBING", "Elevator", "HEAT/HOT WATER"],
    top_titles: ["Hot water off 😩😩😩 I’m in the G loop!", "No AC , the water is back on , but no hot water.", "Been here over 30yrs and the a/c & heating service is getting worse every year…"],
    score: 80.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  },
  {
    id: 169,
    area_id: 335,
    area: "Brooklyn",
    borough: "Brooklyn",
    area_type: "borough",
    signal_type: "community_concerns",
    category: "public_space_and_quality_of_life",
    trend: "growing",
    headline: "Multiple residents are discussing quality-of-life issues in Brooklyn",
    community_posts: 17,
    reports_311: 0,
    news_items: 0,
    approved_cards: 2,
    top_complaint_types: [],
    top_titles: ["I'm at the Brooklyn Bridge Park fireworks setup. NYPD is funneling people into…", "I don't mean to alarm anyone? but the Brooklyn Bridge appears to have a bit of…", "Fire breaks out on Brooklyn Bridge during July 4 fireworks display"],
    score: 66.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  },
  {
    id: 306,
    area_id: 118,
    area: "Flatbush",
    borough: "Brooklyn",
    area_type: "nta",
    signal_type: "community_concerns",
    category: "public_space_and_quality_of_life",
    trend: "steady",
    headline: "Residents are discussing quality-of-life issues in Flatbush",
    community_posts: 1,
    reports_311: 182,
    news_items: 0,
    approved_cards: 0,
    top_complaint_types: ["Illegal Fireworks", "Noise - Residential", "Noise - Helicopter"],
    top_titles: ["22nd street between Ditmas and Newkirk-- how can we get together as neighbors…"],
    score: 185.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  },
  {
    id: 44,
    area_id: 99,
    area: "Crown Heights (North)",
    borough: "Brooklyn",
    area_type: "nta",
    signal_type: "community_concerns",
    category: "public_space_and_quality_of_life",
    trend: "steady",
    headline: "Multiple residents are discussing quality-of-life issues in Crown Heights (North)",
    community_posts: 2,
    reports_311: 74,
    news_items: 0,
    approved_cards: 2,
    top_complaint_types: ["Noise - Residential", "Illegal Fireworks", "Noise - Commercial"],
    top_titles: ["Does anyone know about what can be done about the street vendors who have been…", "Smoke alarm at the old Berg’n and firemen swarming in, this building refuses to…"],
    score: 90.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  },
  {
    id: 64,
    area_id: 118,
    area: "Flatbush",
    borough: "Brooklyn",
    area_type: "nta",
    signal_type: "public_services",
    category: "streets_sidewalks_and_transportation",
    trend: "steady",
    headline: "Multiple residents are discussing street and transit issues in Flatbush",
    community_posts: 5,
    reports_311: 57,
    news_items: 5,
    approved_cards: 0,
    top_complaint_types: ["Noise - Street/Sidewalk", "Illegal Parking", "Blocked Driveway"],
    top_titles: ["‘Next Stop’: Mamdani, Hochul roll out plan to cut NYC bus trips by 6 minutes on…", "Mamdani, Hochul Announce Plan to Speed Up Buses on 50 Routes Across NYC's Five…", "Mamdani, Hochul’s $800M plan to speed up NYC buses means more Big Brother…"],
    score: 77.0,
    window_days: 7,
    window_start: "2026-07-03T14:23:04.955349Z",
    window_end: "2026-07-10T14:23:04.955349Z",
    generated_at: "2026-07-10T14:23:07.148315Z"
  }
];
