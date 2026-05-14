// ============================================================================
// app/surface-layout.js
// One UI surface grammar based layout system
// Surface-first, zone-first, slot-based renderer
// ============================================================================

window.SURFACE_TYPES = {
  LOCKSCREEN: 'lockscreen',
  FIRST_DEPTH_LIST: 'first-depth-list',
  SECOND_DEPTH_DETAIL: 'second-depth-detail',
  TAB_ROOT: 'tab-root',
  DIALOG_BOTTOM: 'dialog-bottom',
  DIALOG_CENTER: 'dialog-center',
  QUICK_SETTINGS: 'quick-settings',
  NOTIFICATION_SHADE: 'notification-shade',
  SELECTION_MODE: 'selection-mode'
};

window.currentSurfaceType = window.SURFACE_TYPES.FIRST_DEPTH_LIST;

/** Themes set `--oneui-chroma: mono` (e.g. Mono · Grayscale) so skies/icons stay neutral — no chroma accents in markup. */
function _isMonoChromaRoot() {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return false;
    if (document.documentElement.classList.contains('is-mono-chroma')) return true;
    var v = (getComputedStyle(document.documentElement).getPropertyValue('--oneui-chroma') || '').trim().toLowerCase();
    return v === 'mono' || v === 'grayscale' || v === 'greyscale';
  } catch (e) {
    return false;
  }
}

function _themeSurfaceStyleRoot() {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return 'base';
    var v = (getComputedStyle(document.documentElement).getPropertyValue('--oneui-theme-style') || '').trim().toLowerCase();
    return v || 'base';
  } catch (e) {
    return 'base';
  }
}

window.setSurfaceType = function setSurfaceType(type, el) {
  window.currentSurfaceType = type;

  document.querySelectorAll('.layout-preset').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
};

window.createOneUILayout = function createOneUILayout(viewport, surfaceType) {
  const width = viewport.width || 451;
  const height = viewport.height || 978;

  // Safe-area insets — must clear the device frame's rounded bezel
  // (border-radius:44px on .canvas-frame). Previous safe.bottom=16 was
  // smaller than the bezel radius, so bottom-edge content (shortcut
  // circles, charging pill) ended up partially clipped inside the
  // rounded corner — visible at 100% browser zoom in the user's
  // screenshot. Bumped to 36 (clears the 44px arc and leaves a small
  // visual gap so content doesn't kiss the bezel). Top stays smaller
  // because the status-bar zone already adds visual margin.
  const safe = {
    top: 16,
    right: 28,
    bottom: 36,
    left: 28
  };

  const topSystemH = 28;
  const appBarExpandedH = Math.round(height * 0.22);
  const appBarCollapsedH = 56;
  const interactionStartY = Math.round(height * 0.58);
  // bottomNavH bumped from 72 → 80 so the shortcut circles + now-bar
  // pill have enough vertical room AND are positioned higher within
  // the safe area (no longer touching the bezel arc).
  const bottomNavH = 80;
  const bottomBarH = 64;

  return {
    viewport: { width, height },
    safe,
    metrics: {
      topSystemH,
      appBarExpandedH,
      appBarCollapsedH,
      interactionStartY,
      bottomNavH,
      bottomBarH,
      gap: 12,
      focusBlockRadius: 28
    },
    zones: {
      full: {
        x: 0, y: 0, w: width, h: height
      },
      topSystem: {
        x: safe.left,
        y: safe.top,
        w: width - safe.left - safe.right,
        h: topSystemH
      },
      viewing: {
        x: safe.left,
        y: safe.top + topSystemH + 8,
        w: width - safe.left - safe.right,
        h: interactionStartY - (safe.top + topSystemH + 8) - 12
      },
      interaction: {
        x: safe.left,
        y: interactionStartY,
        w: width - safe.left - safe.right,
        h: height - interactionStartY - safe.bottom - bottomNavH
      },
      bottomNav: {
        x: safe.left,
        y: height - safe.bottom - bottomNavH,
        w: width - safe.left - safe.right,
        h: bottomNavH
      },
      bottomBar: {
        x: safe.left,
        y: height - safe.bottom - bottomBarH,
        w: width - safe.left - safe.right,
        h: bottomBarH
      }
    },
    surfaceType
  };
};

window.composeSurfacePlan = function composeSurfacePlan(surfaceType, layout) {
  const T = window.SURFACE_TYPES;

  switch (surfaceType) {
    case T.LOCKSCREEN:
      // Samsung Lock identity chrome. These slot names match the
      // canonical Scene/Lock template (see app/rules-renderer.js
      // ROLE_RENDERERS lookup) so the DOM node id + data-role emitted
      // by the agent path is IDENTICAL to what the canned "Screens >
      // Lock" scene produces. That way the Layers inspector, CSS
      // selectors, and downstream tooling see one naming convention
      // instead of two.
      //   • status-bar    = signal / battery / carrier row
      //   • lockIndicator = padlock icon at top center (Figma y=48)
      //   • weatherDate   = "68° · Partly cloudy · Thu Apr 24" thin line
      //   • clock         = huge center clock (renderer uses current time)
      //   • shortcutLeft  = phone shortcut circle (bottom-left)
      //   • shortcutRight = camera shortcut circle (bottom-right)
      //   • gestureBar    = bottom home-gesture indicator bar
      return {
        surfaceType,
        components: [
          { id: 'status-bar',    role: 'status-bar',    zone: 'topSystem' },
          { id: 'lockIndicator', role: 'lockIndicator', zone: 'topSystem' },
          { id: 'weatherDate',   role: 'weatherDate',   zone: 'viewing' },
          { id: 'clock',         role: 'clock',         zone: 'viewing' },
          { id: 'shortcutLeft',  role: 'shortcutLeft',  zone: 'bottomNav', variant: { icon: 'phone' } },
          { id: 'shortcutRight', role: 'shortcutRight', zone: 'bottomNav', variant: { icon: 'camera' } },
          { id: 'gestureBar',    role: 'gestureBar',    zone: 'bottomAction' }
        ]
      };

    case T.FIRST_DEPTH_LIST: {
      // Pick the search-bar theme ONCE per scene compose and share it with
      // the selection-dialog below so both alternate in sync (Figma
      // 629:1603 = light, 629:1602 = dark — pure black/white, no AI).
      var listTheme = Math.random() < 0.5 ? 'light' : 'dark';

      // Natural-sounding menu scenarios — rotated per scene so the user
      // sees realistic planning / recommendation / schedule content
      // instead of "This is a menu option" placeholders.
      var LIST_SCENARIOS = [
        {
          title: 'Summer travel plan',
          options: [
            'Jun 8-10 \u00b7 Jeju Island (3 days)',
            'Jul 15-22 \u00b7 Italy (1 week)',
            'Book Colosseum tour in Rome',
            'Hike Hallasan \u00b7 Witseoreum trail',
            'Sunscreen SPF50 + eye cream',
            'Book JAL flight (ICN \u2192 FCO)'
          ]
        },
        {
          title: 'Weekend plan \u00b7 Apr 27-28',
          options: [
            'Sat morning \u00b7 Brunch with Mom',
            'Sat afternoon \u00b7 MMCA exhibition',
            'Sat evening \u00b7 IU concert (Olympic Park)',
            'Sun lunch \u00b7 Bukchon hanok restaurant',
            'Sun afternoon \u00b7 Naksan Park sunset walk',
            'Mon morning \u00b7 Confirm reservation'
          ]
        },
        {
          title: 'Today\u2019s agenda \u00b7 Mon, Apr 20',
          options: [
            '10 AM \u00b7 Design team standup',
            '2 PM \u00b7 Q2 review presentation',
            '4 PM \u00b7 Coffee with Sarah',
            'Before EOD \u00b7 Finish project brief',
            'Workout \u00b7 Arms + core',
            'Return Mom\u2019s missed call'
          ]
        },
        {
          title: 'Saved Articles',
          options: [
            'The Future of Ambient UI',
            'Samsung One UI 8.5 deep dive',
            'Why designers write less now',
            'Jony Ive\'s next act, explained',
            'Building a type system at scale',
            'Galaxy S26 review — one year later'
          ]
        },
        {
          title: 'Shopping List · 6 items',
          options: [
            'MacBook Pro M4 14" · Space Black',
            'AirPods Pro 2 (USB-C)',
            'Samsung T7 Shield 2TB',
            'iPhone clear case w/ MagSafe',
            'Sony WH-1000XM5 (Black)',
            'Anker 737 power bank (24K mAh)'
          ]
        },
        {
          title: 'This week\u2019s bookings',
          options: [
            'Tue 7 PM \u00b7 Cheongdam omakase',
            'Wed 10 AM \u00b7 Dental checkup',
            'Thu 6 PM \u00b7 Pilates private lesson',
            'Fri 8 PM \u00b7 Dinner with the kids',
            'Sat 2 PM \u00b7 Gangnam hair salon',
            'Sun 11 AM \u00b7 Han River picnic (4)'
          ]
        }
      ];
      var pickedScenario = LIST_SCENARIOS[Math.floor(Math.random() * LIST_SCENARIOS.length)];

      return {
        surfaceType,
        components: [
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          // Compact Figma "Top" header (989:22761) — big time + date.
          // Replaces the old tall `expandable-app-bar` so search-bar and
          // selection-dialog sit higher with more breathing room.
          // Scenario title moved INTO list-top-bar (above time/date).
          // selection-dialog renders with showTitle:false so the title
          // isn't duplicated in both the header and the menu.
          { id: 'list-top-bar', role: 'list-top-bar', zone: 'viewing',
            variant: { title: pickedScenario.title } },
          { id: 'search-bar', role: 'search-bar', zone: 'viewing',
            variant: { style: listTheme } },
          { id: 'selection-dialog', role: 'selection-dialog', zone: 'interaction',
            variant: {
              theme: listTheme,
              showTitle: false,
              options: pickedScenario.options
            } },
          // Keep the pinned-apps dock on the bottom nav (same shortcuts as Home).
          { id: 'app-dock', role: 'app-dock', zone: 'bottomNav',
            content: { apps: ['Phone','Messages','Internet','Camera'] } }
        ]
      };
    }

    case T.SECOND_DEPTH_DETAIL: {
      // Detail — status-bar (restored) + list-top-bar rendered as TWO
      // lines (greeting title on line 1, time + date on line 2) so the
      // upper area feels balanced next to the stack of focus-blocks
      // below. A random greeting is picked on each generation so the
      // screen reads differently each time.
      var DETAIL_GREETINGS = [
        'Good morning, Kyuha',
        'Here\u2019s your day',
        'Today at a glance',
        'Daily briefing',
        'Welcome back'
      ];
      var detailGreet = DETAIL_GREETINGS[Math.floor(Math.random() * DETAIL_GREETINGS.length)];
      return {
        surfaceType,
        components: [
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'list-top-bar', role: 'list-top-bar', zone: 'viewing',
            variant: { title: detailGreet } },
          { id: 'hero-card',      role: 'focus-block', zone: 'viewing',
            variant: { kind: 'secondary',
              title: 'Morning routine',
              body: 'Weather + calendar preview so you can plan the day at a glance.' } },
          { id: 'secondary-card', role: 'focus-block', zone: 'viewing',
            variant: { kind: 'secondary',
              title: 'Now playing',
              body: 'Resume \u201cDaily Mix 1\u201d on Spotify. Queued: 27 tracks.' } },
          { id: 'tertiary-card',  role: 'focus-block', zone: 'viewing',
            variant: { kind: 'secondary',
              title: 'Coming up',
              body: 'Design review at 3:00 PM with Sarah and Alex. Notes attached.' } },
          { id: 'app-dock', role: 'app-dock', zone: 'bottomNav',
            content: { apps: ['Phone','Messages','Internet','Camera'] } }
        ]
      };
    }

    case T.TAB_ROOT:
      // Home screen — filled with app icon grid (no title, no card list).
      // app-grid expands to N individual app-icon nodes (editable each).
      // app-dock pins 4 shortcuts at the bottom.
      return {
        surfaceType,
        components: [
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'app-grid',   role: 'app-grid',   zone: 'interaction' },
          { id: 'app-dock',   role: 'app-dock',   zone: 'bottomNav',
            content: { apps: ['Phone','Messages','Internet','Camera'] } }
        ]
      };

    case T.DIALOG_BOTTOM:
      return {
        surfaceType,
        components: [
          { id: 'scrim', role: 'scrim', zone: 'full' },
          { id: 'dialog', role: 'bottom-dialog', zone: 'interaction' }
        ]
      };

    case T.DIALOG_CENTER:
      return {
        surfaceType,
        components: [
          { id: 'scrim', role: 'scrim', zone: 'full' },
          { id: 'dialog', role: 'center-dialog', zone: 'full' }
        ]
      };

    case T.QUICK_SETTINGS:
      return {
        surfaceType,
        components: [
          { id: 'qs-bg', role: 'background', zone: 'full' },
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'qs-panel', role: 'quick-settings-panel', zone: 'interaction' }
        ]
      };

    case T.NOTIFICATION_SHADE:
      return {
        surfaceType,
        components: [
          { id: 'shade-bg', role: 'background', zone: 'full' },
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'notif-list', role: 'notification-list', zone: 'interaction' }
        ]
      };

    case T.SELECTION_MODE:
      return {
        surfaceType,
        components: [
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'selection-app-bar', role: 'selection-app-bar', zone: 'viewing' },
          { id: 'selection-list', role: 'list', zone: 'interaction' },
          { id: 'selection-toolbar', role: 'bottom-bar', zone: 'bottomBar' }
        ]
      };

    default:
      return {
        surfaceType,
        components: [
          { id: 'status-bar', role: 'status-bar', zone: 'topSystem' },
          { id: 'app-bar', role: 'collapsed-app-bar', zone: 'viewing' },
          { id: 'content', role: 'detail-content', zone: 'interaction' }
        ]
      };
  }
};

// ============================================================================
// Container expansion — turn compositional roles (list, focus-block-group,
// detail-content) into individual editable nodes with real gaps.
// ============================================================================

// List-item preset pool — messaging-style rows with varied content
var LIST_ITEM_PRESETS = [
  { avatar: 'Messages.png',  title: 'Jimin',          subtitle: 'See you at 7 PM',            time: '2m',  badge: 3 },
  { avatar: null, glyph: 'M', accent: '#EA4335', title: 'Sarah Chen',   subtitle: 'Re: Q2 planning — let\u2019s sync', time: '12m' },
  { avatar: 'Contacts.png',  title: 'Hannah',         subtitle: '\u266B Voice message',        time: '1h',  badge: 1 },
  { avatar: null, glyph: 'S', accent: '#611F69', title: 'Alex (Slack)', subtitle: 'PR is ready for review',        time: '30m' },
  { avatar: 'Notes.png',     title: 'Maya',           subtitle: 'Added you to "Trip plan"',    time: '3h' },
  { avatar: null, glyph: 'D', accent: '#5865F2', title: 'Dev Community',subtitle: 'New message in #general',       time: '5h',  badge: 12 },
  { avatar: 'Gallery.png',   title: 'Tomas',          subtitle: 'Shared a photo',              time: '6h' },
  { avatar: null, glyph: 'F', accent: '#25D366', title: 'Family',       subtitle: 'Dad: Pickup at 6',              time: '1d' },
  { avatar: 'Clock.png',     title: 'Reminder',       subtitle: 'Call mom today',              time: '9h' },
  { avatar: null, glyph: 'W', accent: '#1DA1F2', title: 'Work',         subtitle: 'Standup tomorrow at 10',        time: '1d' }
];

function _randomList(pool, n) {
  var copy = pool.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = copy[i]; copy[i] = copy[j]; copy[j] = t;
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// Widget presets (for focus-block-group cells)
var WIDGET_PRESETS = [
  { kind: 'weather',  title: 'Seoul',        value: '18\u00B0',  accent: '#5AC8FA', sub: 'Partly cloudy' },
  { kind: 'battery',  title: 'Battery',      value: '69%',       accent: '#34C759', sub: '5h left' },
  { kind: 'activity', title: 'Steps',        value: '4,209',     accent: '#FF6B6B', sub: 'Goal 6,000' },
  { kind: 'music',    title: 'Now playing',  value: 'Dynamite',  accent: '#9B6BE6', sub: 'BTS' },
  { kind: 'calendar', title: 'Today',        value: '3 events',  accent: '#4285F4', sub: 'Next: 2pm stand-up' },
  { kind: 'alarm',    title: 'Alarm',        value: '7:00 AM',   accent: '#FF9500', sub: 'Weekday' }
];

window.expandContainerComponents = function expandContainerComponents(plan, layout) {
  if (!plan || !Array.isArray(plan.components)) return plan;
  var out = [];
  plan.components.forEach(function (comp) {
    var kids = null;
    if (comp.role === 'list')                kids = _expandList(comp, layout);
    else if (comp.role === 'notification-list') kids = _expandList(comp, layout); // same vertical stack
    else if (comp.role === 'focus-block-group') kids = _expandFocusBlockGroup(comp, layout);
    else if (comp.role === 'detail-content')  kids = _expandDetailContent(comp, layout);
    else if (comp.role === 'app-grid')        kids = _expandAppGrid(comp, layout);
    if (kids && kids.length) {
      out.push.apply(out, kids);
    } else {
      out.push(comp);
    }
  });
  plan.components = out;
  return plan;
};

// Home app grid — fills the space from below status-bar to above dock with
// a 4-column grid of app icons. Each cell becomes an editable `app-icon` node.
var HOME_APP_POOL = [
  'Phone', 'Messages', 'Camera', 'Gallery',
  'Contacts', 'Clock', 'Weather', 'Calculator',
  'Settings', 'Notes', 'Cloud', 'Health',
  'Reminder', 'Store', 'SmartThings', 'Bixby',
  'Internet', 'MyFiles', 'Studio', 'Wallet'
];

function _expandAppGrid(comp, layout) {
  var z = layout.zones;
  var leftX  = z.topSystem.x;
  var rightX = leftX + z.topSystem.w;
  var topY   = z.topSystem.y + z.topSystem.h + 12;        // below status bar
  var bottomY = z.bottomNav.y - 10;                        // above dock
  var gridW  = rightX - leftX;
  var gridH  = bottomY - topY;

  var cols   = 4;
  var colGap = 4;
  var labelH = 22;                                          // text row under icon
  var rowGap = 10;

  var cellW = Math.floor((gridW - colGap * (cols - 1)) / cols);
  var cellH = cellW + labelH;                              // icon area + label

  var rows = Math.max(1, Math.floor((gridH + rowGap) / (cellH + rowGap)));
  if (rows > 5) rows = 5;
  var total = Math.min(rows * cols, HOME_APP_POOL.length);

  // Center the grid vertically if there's leftover space
  var actualH = rows * cellH + (rows - 1) * rowGap;
  var startY = topY + Math.max(0, Math.floor((gridH - actualH) / 2));

  var result = [];
  for (var i = 0; i < total; i++) {
    var r = Math.floor(i / cols), c = i % cols;
    result.push({
      id: comp.id + ':app-' + i,
      role: 'app-icon',
      zone: comp.zone,
      _rect: {
        x: leftX + c * (cellW + colGap),
        y: startY + r * (cellH + rowGap),
        w: cellW,
        h: cellH
      },
      variant: { app: HOME_APP_POOL[i] }
    });
  }
  return result;
}

function _expandList(comp, layout) {
  var z = layout.zones[comp.zone] || layout.zones.interaction;
  var gap = (layout.metrics && layout.metrics.gap) || 8;
  var itemH = 72;  // One UI list-item default
  var maxCount = Math.max(1, Math.floor((z.h + gap) / (itemH + gap)));

  // Prefer agent-provided items when present — maps arbitrary shape into
  // our canonical list-item variant. Falls back to random presets otherwise.
  var agentItems = (comp.content && Array.isArray(comp.content.items))
    ? comp.content.items : null;

  var count, picked;
  if (agentItems && agentItems.length) {
    count = Math.min(agentItems.length, maxCount);
    picked = agentItems.slice(0, count).map(function (it) {
      it = it || {};
      return {
        title:    it.title    || it.name    || it.primary  || 'Item',
        subtitle: it.subtitle || it.secondary || it.description || it.body || '',
        time:     it.time     || it.timestamp || it.date   || '',
        avatar:   it.avatar   || it.icon     || null,
        glyph:    it.glyph    || null,
        accent:   it.accent   || null,
        badge:    it.badge    != null ? it.badge : undefined
      };
    });
  } else {
    count = Math.min(6, maxCount);
    picked = _randomList(LIST_ITEM_PRESETS, count);
  }

  var result = [];
  var y = z.y;
  for (var i = 0; i < count; i++) {
    result.push({
      id: comp.id + ':item-' + i,
      role: 'list-item',
      zone: comp.zone,
      _rect: { x: z.x, y: y, w: z.w, h: itemH },
      variant: picked[i] || {}
    });
    y += itemH + gap;
  }
  return result;
}

function _expandFocusBlockGroup(comp, layout) {
  var z = layout.zones[comp.zone] || layout.zones.interaction;
  var cols = 2, rows = 2;
  var gap = (layout.metrics && layout.metrics.gap) || 12;
  var cellW = Math.round((z.w - gap * (cols - 1)) / cols);
  // cap cell height so the group doesn't stretch the full zone
  var cellH = Math.min(110, Math.round((z.h - gap * (rows - 1)) / rows));
  var picked = _randomList(WIDGET_PRESETS, cols * rows);
  var result = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var i = r * cols + c;
      result.push({
        id: comp.id + ':cell-' + i,
        role: 'focus-block',
        zone: comp.zone,
        _rect: {
          x: z.x + c * (cellW + gap),
          y: z.y + r * (cellH + gap),
          w: cellW,
          h: cellH
        },
        variant: picked[i] || {}
      });
    }
  }
  return result;
}

function _expandDetailContent(comp, layout) {
  var z = layout.zones[comp.zone] || layout.zones.interaction;
  var gap = (layout.metrics && layout.metrics.gap) || 12;
  var items = [];
  var y = z.y;

  // Agent-provided content (preferred) or fallback copy
  var c = comp.content || {};
  var heroTitle   = c.hero || c.title || 'Hero content';
  var titleText   = c.title || c.headline || 'Detail Title';
  var bodyParas   = Array.isArray(c.paragraphs) && c.paragraphs.length
    ? c.paragraphs
    : Array.isArray(c.body) ? c.body
    : (c.description
        ? [c.description]
        : [
            'Concise description of the detail — one or two lines that give the user the core of what they\u2019re looking at.',
            'A secondary paragraph with supporting info. Tap to expand for more context, reviews, or related items.'
          ]);
  var actions = c.actions || c.primaryAction
    ? {
        primary:   (c.actions && c.actions[0] && (c.actions[0].label || c.actions[0].text)) || c.primaryAction || 'Save',
        secondary: (c.actions && c.actions[1] && (c.actions[1].label || c.actions[1].text)) || c.secondaryAction || 'Share'
      }
    : { primary: 'Save', secondary: 'Share' };

  // Hero card (4:3 aspect)
  var heroH = Math.round(z.w * 0.6);
  items.push({
    id: comp.id + ':hero', role: 'focus-block', zone: comp.zone,
    _rect: { x: z.x, y: y, w: z.w, h: heroH },
    variant: { kind: 'hero', title: heroTitle }
  });
  y += heroH + gap;

  // Title block
  items.push({
    id: comp.id + ':title', role: 'paragraph', zone: comp.zone,
    _rect: { x: z.x, y: y, w: z.w, h: 48 },
    variant: { kind: 'title', text: titleText }
  });
  y += 48 + gap;

  // Body paragraphs (agent-provided or fallback)
  for (var p = 0; p < Math.min(bodyParas.length, 3) && (y + 52) <= z.y + z.h - 60; p++) {
    items.push({
      id: comp.id + ':para-' + p, role: 'paragraph', zone: comp.zone,
      _rect: { x: z.x, y: y, w: z.w, h: 52 },
      variant: { kind: 'body', text: bodyParas[p] }
    });
    y += 52 + gap;
  }

  // Action row
  items.push({
    id: comp.id + ':actions', role: 'action-row', zone: comp.zone,
    _rect: { x: z.x, y: y, w: z.w, h: 48 },
    variant: actions
  });

  return items;
}

window.resolveComponentRect = function resolveComponentRect(comp, layout, plan) {
  // If the container-expansion pass already computed a rect, use it as-is.
  if (comp._rect) return comp._rect;

  const z = layout.zones;
  const m = layout.metrics;
  const vw = layout.viewport.width;
  const vh = layout.viewport.height;

  switch (comp.role) {
    case 'status-bar':
      return {
        x: z.topSystem.x,
        y: z.topSystem.y,
        w: z.topSystem.w,
        h: z.topSystem.h
      };

    case 'expandable-app-bar':
      return {
        x: z.viewing.x,
        y: z.viewing.y,
        w: z.viewing.w,
        h: comp.state === 'expanded' ? m.appBarExpandedH : m.appBarCollapsedH
      };

    case 'collapsed-app-bar':
    case 'selection-app-bar':
      return {
        x: z.viewing.x,
        y: z.viewing.y,
        w: z.viewing.w,
        h: m.appBarCollapsedH
      };

    case 'search-bar':
      // Sits below the list-top-bar (80h + 8 gap). The top-bar now holds
      // a title line + time/date line so it's taller than before.
      return {
        x: z.viewing.x,
        y: z.viewing.y + 80 + 8,   // list-top-bar.bottom + 8
        w: z.viewing.w,
        h: 44
      };

    case 'focus-block': {
      // Sits below the list-top-bar (80h + 12 gap). Detail screen may
      // include up to THREE stacked focus-blocks — 'secondary-card' (or
      // 'hero-card-2') offsets below the first by 1× (fbH + 12 gap),
      // and 'tertiary-card' (or 'hero-card-3') offsets by 2×.
      var fbBaseY = z.viewing.y + 80 + 12;
      var fbH = 160;
      var fbY = fbBaseY;
      if (comp.id === 'secondary-card' || comp.id === 'hero-card-2') {
        fbY = fbBaseY + fbH + 12;
      } else if (comp.id === 'tertiary-card' || comp.id === 'hero-card-3') {
        fbY = fbBaseY + (fbH + 12) * 2;
      }
      return {
        x: z.viewing.x,
        y: fbY,
        w: z.viewing.w,
        h: fbH
      };
    }

    case 'focus-block-group':
      return {
        x: z.interaction.x,
        y: z.interaction.y,
        w: z.interaction.w,
        h: z.interaction.h - 12
      };

    case 'detail-content':
    case 'list':
    case 'notification-list':
      return {
        x: z.interaction.x,
        y: z.interaction.y,
        w: z.interaction.w,
        h: z.interaction.h
      };

    case 'list-top-bar':
      // Figma "Top" header (989:22761) + optional title line above.
      // Height 80: 30 for title + 4 gap + 35 for time/date + 11 pad.
      // When no title, still uses 80 so downstream positions stay stable.
      return {
        x: z.viewing.x,
        y: z.viewing.y,
        w: z.viewing.w,
        h: 80
      };

    case 'selection-dialog': {
      // Sits just below the search-bar on List screens. Starts at
      // (list-top-bar + 8 gap + search-bar + 16 gap) and extends through
      // the interaction zone so the 6 menu options have room to breathe.
      var sdY = z.viewing.y + 80 + 8 + 44 + 16; // top-bar(80) + gap + search-bar(44) + gap
      var sdH = (z.interaction.y + z.interaction.h) - sdY - 12;
      return {
        x: z.viewing.x,
        y: sdY,
        w: z.viewing.w,
        h: Math.max(200, sdH)
      };
    }

    case 'bottom-navigation':
    case 'app-dock':
      return {
        x: z.bottomNav.x,
        y: z.bottomNav.y,
        w: z.bottomNav.w,
        h: z.bottomNav.h
      };

    case 'app-grid':
      // Full content column between status bar and dock.
      return {
        x: z.topSystem.x,
        y: z.topSystem.y + z.topSystem.h + 12,
        w: z.topSystem.w,
        h: z.bottomNav.y - (z.topSystem.y + z.topSystem.h + 12) - 10
      };

    case 'bottom-bar':
      return {
        x: z.bottomBar.x,
        y: z.bottomBar.y,
        w: z.bottomBar.w,
        h: z.bottomBar.h
      };

    case 'bottom-dialog':
      return {
        x: 0,
        y: vh - 320,
        w: vw,
        h: 320
      };

    case 'center-dialog':
      return {
        x: Math.round(vw * 0.1),
        y: Math.round(vh * 0.38),
        w: Math.round(vw * 0.8),
        h: 220
      };

    case 'quick-settings-panel':
      return {
        x: 0,
        y: Math.round(vh * 0.16),
        w: vw,
        h: vh - Math.round(vh * 0.16)
      };

    // Canonical Samsung lockscreen atomics (names match Scene/Lock
    // template layers — see app/rules-renderer.js ROLE_RENDERERS).
    // Coordinates mirror the Figma Lock frame 451×978:
    //   lockIndicator y≈48  (small padlock icon, top center)
    //   weatherDate   y≈133 (condition + temp line above the clock)
    //   clock         y≈179 (huge center clock)
    //   shortcutLeft/Right = 47×47 circles in bottomNav zone corners
    //   gestureBar    = full-width 24h home indicator at very bottom
    case 'lockIndicator':
    case 'lock-indicator':   // kebab alias, same render target
      return {
        x: Math.round(vw / 2 - 12),
        y: z.topSystem.y + z.topSystem.h + 12,
        w: 24,
        h: 24
      };

    case 'weatherDate':
    case 'weather-date':
      return {
        x: z.viewing.x,
        y: z.viewing.y + 44,
        w: z.viewing.w,
        h: 28
      };

    case 'clock':
    case 'lock-clock':
    case 'lock-time':
      return {
        x: z.viewing.x,
        y: z.viewing.y + 78,
        w: z.viewing.w,
        h: 176
      };

    case 'lock-date':
      return {
        x: z.viewing.x,
        y: z.viewing.y + 262,
        w: z.viewing.w,
        h: 28
      };

    case 'shortcutLeft':
      return {
        x: z.bottomNav.x + 6,
        y: z.bottomNav.y + Math.round((z.bottomNav.h - 47) / 2),
        w: 47,
        h: 47
      };

    case 'shortcutRight':
      return {
        x: z.bottomNav.x + z.bottomNav.w - 47 - 6,
        y: z.bottomNav.y + Math.round((z.bottomNav.h - 47) / 2),
        w: 47,
        h: 47
      };

    case 'lock-shortcuts':   // legacy combined role
      return {
        x: z.bottomNav.x,
        y: z.bottomNav.y,
        w: z.bottomNav.w,
        h: z.bottomNav.h
      };

    case 'gestureBar':
      return {
        x: 0,
        y: vh - 24,
        w: vw,
        h: 24
      };

    case 'unlock-hint':
      return {
        x: z.bottomNav.x,
        y: (z.bottomNav.y || vh - 80) - 48,
        w: z.bottomNav.w,
        h: 32
      };

    case 'scrim':
    case 'background':
      return {
        x: 0,
        y: 0,
        w: vw,
        h: vh
      };

    default:
      return {
        x: z.interaction.x,
        y: z.interaction.y,
        w: 200,
        h: 60
      };
  }
};

// ── Token helpers (typography + glass + radius + spacing) ───────────────
// Thin wrappers that read from design_rules.json via Generator.* when loaded.
// Fallbacks are defensive for offline / early-boot rendering.
function _T(size, opts) {
  if (window.Generator && typeof window.Generator.typography === 'function') {
    return window.Generator.typography(size, opts || {});
  }
  var Tr = typeof TypographyRules !== 'undefined' ? TypographyRules : null;
  if (Tr && typeof Tr.buildTypographyStyle === 'function') {
    var slice = Tr.MINIMAL_FALLBACK_TYPOGRAPHY;
    var dr = (typeof window.__DESIGN_RULES !== 'undefined' && window.__DESIGN_RULES)
      ? window.__DESIGN_RULES
      : null;
    if (dr && dr.typography) slice = dr.typography;
    return Tr.buildTypographyStyle(slice, size, opts || {});
  }
  return '';
}
function _G(tier) {
  var __surfTier = _themeSurfaceStyleRoot();
  // Neon matches flat: single matte surface token — avoid the glass gradient stack.
  if (__surfTier === 'flat' || __surfTier === 'neon') {
    return 'background:var(--surface-bg, rgba(23,23,26,0.80));' +
      '-webkit-backdrop-filter:var(--surface-filter, blur(24px));backdrop-filter:var(--surface-filter, blur(24px));' +
      'border:var(--surface-border, 1px solid rgba(255,255,255,0.06));' +
      'box-shadow:var(--surface-shadow, none);';
  }
  // Default / 기본 프리셋: 단일 표면 레이어 + 토큰 기반 블러/테두리.
  // (구형 이중 레이어 `transparent, var(--surface-bg)` + color-mix 폴백은
  // 일부 브라우저에서 배경 전체가 빠져 카드가 투명해 보이는 경우가 있었음.)
  if (_themeSurfaceStyleRoot() === 'base') {
    return 'background:var(--surface-bg, rgba(23,23,26,0.60));' +
      '-webkit-backdrop-filter:var(--surface-filter, blur(48px));backdrop-filter:var(--surface-filter, blur(48px));' +
      'border:var(--surface-border, 1px solid rgba(255,255,255,0.12));' +
      'box-shadow:var(--surface-shadow, none);';
  }
  if (_themeSurfaceStyleRoot() === 'glass') {
    return 'background:var(--surface-overlay, transparent), var(--surface-bg, rgba(255,255,255,0.10));' +
      'background-size:var(--surface-bg-size, 160% 160%);' +
      '-webkit-backdrop-filter:var(--surface-filter, blur(42px) saturate(1.55));backdrop-filter:var(--surface-filter, blur(42px) saturate(1.55));' +
      'border:var(--surface-border, 1px solid rgba(255,255,255,0.34));' +
      'box-shadow:var(--surface-shadow, inset 0 1px 0 rgba(255,255,255,0.46), 0 22px 60px rgba(0,0,0,0.30));';
  }
  var fallback = tier === 'widgetPill'
    ? 'rgba(23,23,26,0.6)'
    : 'rgba(23,23,26,0.60)';
  return 'background:var(--surface-overlay, transparent), var(--surface-bg,' + fallback + ');' +
    'background-size:var(--surface-bg-size, auto);animation:var(--surface-animation, none);' +
    '-webkit-backdrop-filter:var(--surface-filter, blur(20px));backdrop-filter:var(--surface-filter, blur(20px));' +
    'border:var(--surface-border, 1px solid rgba(255,255,255,0.08));' +
    'box-shadow:var(--surface-shadow, none);';
}
function _R(tier) {
  if (window.Generator && typeof window.Generator.radius === 'function') {
    return window.Generator.radius(tier);
  }
  const rMap = { small:20, card:20, medium:20, widget:20, pill:32, dialog:20, panel:20, container:20, circle:63.636 };
  return (rMap[tier] != null ? rMap[tier] : 14) + 'px';
}
function _S(tier) {
  if (window.Generator && typeof window.Generator.spacing === 'function') {
    return window.Generator.spacing(tier);
  }
  const sMap = { xs:4, sm:6, md:8, base:10, lg:12, xl:14, xxl:16, '3xl':18, '4xl':20 };
  return (sMap[tier] != null ? sMap[tier] : 8) + 'px';
}

// ── Weather icon — monochrome (Mono · Grayscale theme) ──────────────────
function _weatherIconSvgMonochrome(name) {
  var N = (name || 'sun').toLowerCase();
  var base = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">';
  var close = '</svg>';
  var hi = '#d4d4d8';
  var mid = '#9a9a9f';
  var lo = '#6f6f75';
  var cloud = '<path d="M7 17a4 4 0 0 1-1-7.87A6 6 0 0 1 17.5 8.5 4 4 0 0 1 17 17H7z" fill="' + lo + '"/>';
  var cloud2 = '<path d="M7 17a4 4 0 0 1-1-7.87A6 6 0 0 1 17.5 8.5 4 4 0 0 1 17 17H7z" fill="' + mid + '"/>';
  switch (N) {
    case 'sun':
    case 'clear':
      return base +
        '<circle cx="12" cy="12" r="4.5" fill="' + hi + '"/>' +
        '<g stroke="' + hi + '" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M12 2v2.5M12 19.5v2.5M2 12h2.5M19.5 12h2.5"/>' +
          '<path d="M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>' +
        '</g>' +
      close;
    case 'cloud-sun':
    case 'partly-cloudy':
      return base +
        '<circle cx="8" cy="7.5" r="3" fill="' + hi + '"/>' +
        '<g stroke="' + hi + '" strokeWidth="1.5" strokeLinecap="round">' +
          '<path d="M8 2v1.5M2 7.5h1.5M3.5 3.5l1.06 1.06M12.5 3.5l-1.06 1.06M2.94 11.56l1.06-1.06"/>' +
        '</g>' +
        cloud +
      close;
    case 'cloud':
    case 'overcast':
      return base + cloud2 + close;
    case 'rain':
    case 'showers':
    case 'drizzle':
      return base +
        cloud2 +
        '<g stroke="' + mid + '" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M9 19v2.5M12 19.5v2M15 19v2.5"/>' +
        '</g>' +
      close;
    case 'snow':
    case 'sleet':
      return base +
        cloud +
        '<g fill="' + hi + '">' +
          '<circle cx="9" cy="20" r="1.2"/>' +
          '<circle cx="12" cy="21" r="1.2"/>' +
          '<circle cx="15" cy="20" r="1.2"/>' +
        '</g>' +
      close;
    case 'bolt':
    case 'storm':
    case 'thunderstorm':
      return base +
        cloud2 +
        '<path d="M12 18l-2 4h2.5l-1 4 4-6h-2.5l1-2z" fill="' + hi + '"/>' +
      close;
    case 'fog':
    case 'mist':
    case 'haze':
      return base +
        '<g stroke="' + mid + '" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M3 8h18M3 12h18M3 16h13M5 20h14"/>' +
        '</g>' +
      close;
    case 'wind':
    case 'windy':
      return base +
        '<g stroke="' + mid + '" strokeWidth="2" strokeLinecap="round" fill="none">' +
          '<path d="M3 9h12a3 3 0 1 0-3-3"/>' +
          '<path d="M3 15h15a3 3 0 1 1-3 3"/>' +
        '</g>' +
      close;
    default:
      return base + cloud2 + close;
  }
}

// ── Weather icon glyph set ──────────────────────────────────────────────
// Returns an inline SVG string for the named weather condition. Sized to
// fill its container. Used by the focus-block weather variant. The colors
// are tuned to read on the dark glass card surface — sun is amber, cloud
// is light gray, rain is sky blue, snow is white-on-cloud, etc.
function _weatherIconSvg(name) {
  if (_isMonoChromaRoot()) {
    return _weatherIconSvgMonochrome(name);
  }
  const N = (name || 'sun').toLowerCase();
  const base = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">';
  const close = '</svg>';
  const cloud = '<path d="M7 17a4 4 0 0 1-1-7.87A6 6 0 0 1 17.5 8.5 4 4 0 0 1 17 17H7z" fill="#E5E7EB"/>';
  const cloudGray = '<path d="M7 17a4 4 0 0 1-1-7.87A6 6 0 0 1 17.5 8.5 4 4 0 0 1 17 17H7z" fill="#9CA3AF"/>';
  switch (N) {
    case 'sun':
    case 'clear':
      return base +
        '<circle cx="12" cy="12" r="4.5" fill="#FBBF24"/>' +
        '<g stroke="#FBBF24" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M12 2v2.5M12 19.5v2.5M2 12h2.5M19.5 12h2.5"/>' +
          '<path d="M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>' +
        '</g>' +
      close;
    case 'cloud-sun':
    case 'partly-cloudy':
      return base +
        '<circle cx="8" cy="7.5" r="3" fill="#FBBF24"/>' +
        '<g stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round">' +
          '<path d="M8 2v1.5M2 7.5h1.5M3.5 3.5l1.06 1.06M12.5 3.5l-1.06 1.06M2.94 11.56l1.06-1.06"/>' +
        '</g>' +
        cloud +
      close;
    case 'cloud':
    case 'overcast':
      return base + cloud + close;
    case 'rain':
    case 'showers':
    case 'drizzle':
      return base +
        cloudGray +
        '<g stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M9 19v2.5M12 19.5v2M15 19v2.5"/>' +
        '</g>' +
      close;
    case 'snow':
    case 'sleet':
      return base +
        cloud +
        '<g fill="#fff">' +
          '<circle cx="9" cy="20" r="1.2"/>' +
          '<circle cx="12" cy="21" r="1.2"/>' +
          '<circle cx="15" cy="20" r="1.2"/>' +
        '</g>' +
      close;
    case 'bolt':
    case 'storm':
    case 'thunderstorm':
      return base +
        cloudGray +
        '<path d="M12 18l-2 4h2.5l-1 4 4-6h-2.5l1-2z" fill="#FBBF24"/>' +
      close;
    case 'fog':
    case 'mist':
    case 'haze':
      return base +
        '<g stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">' +
          '<path d="M3 8h18M3 12h18M3 16h13M5 20h14"/>' +
        '</g>' +
      close;
    case 'wind':
    case 'windy':
      return base +
        '<g stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none">' +
          '<path d="M3 9h12a3 3 0 1 0-3-3"/>' +
          '<path d="M3 15h15a3 3 0 1 1-3 3"/>' +
        '</g>' +
      close;
    default:
      return base + cloud + close;
  }
}

window.renderAtomicForRole = function renderAtomicForRole(comp, rect) {
  const A = window.GalaxyAtomics || {};

  switch (comp.role) {
    case 'status-bar':
      return A.StatusBar
        ? A.StatusBar({ theme: 'dark', battery: 69, carrier: 'K-Arts' })
        : '<div style="height:100%;display:flex;align-items:center;justify-content:space-between;' +
            _T('caption', { color: 'statusBar' }) +
          '"><span>12:45</span><span>69%</span></div>';

    case 'list-top-bar': {
      // Figma "Top" 989:22761 + optional title line.
      //   Line 1 (18/700): big bold title (e.g. scenario title)
      //   Line 2: 26/700 time "8:21" + 18/500 date "Thu 28 Aug" inline
      // When variant.title is empty, only the time/date line renders.
      var ltv = (comp && comp.variant) || {};
      var ltTitle = ltv.title || '';
      var now = new Date();
      var h = now.getHours();
      var mi = now.getMinutes();
      var timeStr = h + ':' + (mi < 10 ? '0' + mi : String(mi));
      var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var mon  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var dateStr = days[now.getDay()] + ' ' + now.getDate() + ' ' + mon[now.getMonth()];
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:0 10px;box-sizing:border-box;color:#fff;font-family:var(--font);">' +
        (ltTitle
          ? '<div style="font-size:22px;font-weight:700;letter-spacing:-0.1px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + ltTitle + '</div>'
          : '') +
        '<div style="display:flex;align-items:center;gap:20px;">' +
          '<span style="font-size:22px;font-weight:700;letter-spacing:0.22px;line-height:1;">' + timeStr + '</span>' +
          '<span style="font-size:15px;font-weight:500;letter-spacing:0.15px;line-height:1;opacity:0.9;">' + dateStr + '</span>' +
        '</div>' +
      '</div>';
    }

    case 'expandable-app-bar': {
      var abc = (comp && comp.content) || {};
      var abTitle = abc.title || comp.text || 'Title';
      var abSub   = abc.subtitle || '';
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 0 ' + _S('lg') + ' 0;box-sizing:border-box;">' +
        '<div data-appbar-title="1" style="' +
          _T(comp.state === 'expanded' ? 'headline' : 'heading', { weight: 'bold' }) +
          'line-height:1.1;transition:font-size 220ms cubic-bezier(0.2,0,0,1), transform 220ms cubic-bezier(0.2,0,0,1);">' + abTitle + '</div>' +
        (abSub ? '<div style="' + _T('caption', { color: 'translucentLabel' }) + 'margin-top:2px;">' + abSub + '</div>' : '') +
      '</div>';
    }

    case 'collapsed-app-bar':
    case 'selection-app-bar': {
      var cabc = (comp && comp.content) || {};
      var cabTitle = cabc.title || comp.text || 'Title';
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;">' +
        '<span style="' + _T('heading', { weight: 'bold' }) + '">' + cabTitle + '</span>' +
        '<span style="' + _T('large') + 'opacity:0.7;">⋮</span>' +
      '</div>';
    }

    case 'selection-dialog': {
      // Figma SelectionDialog — node 629:1603 (light) / 629:1602 (dark).
      //   container: 354 wide, bg rgba(255,255,255,0.5) OR rgba(0,0,0,0.5),
      //              backdrop-blur 24, rounded 28, padding 24, gap 24
      //   title: 20/600 (bold), theme-colored
      //   options: 6 rows, 20/400, theme-colored, 30h each
      var sdv = (comp && comp.variant) || {};
      var sdTheme = sdv.theme === 'dark' ? 'dark' : 'light';
      var sdTitle = sdv.title || 'This is a menu title';
      var DEFAULT_OPTIONS = [
        'This is a menu option',
        'This is a menu option',
        'This is a menu option',
        'This is a menu option',
        'This is a menu option',
        'This is a menu option'
      ];
      var sdOptions = Array.isArray(sdv.options) ? sdv.options : DEFAULT_OPTIONS;
      var sdShowTitle = sdv.showTitle !== false;
      var sdBg, sdText;
      if (sdTheme === 'dark') {
        sdBg   = 'rgba(0,0,0,0.5)';
        sdText = '#ffffff';
      } else {
        sdBg   = 'rgba(255,255,255,0.5)';
        sdText = '#000000';
      }
      var titleHTML = sdShowTitle
        ? '<div data-shortcut="1" style="width:100%;padding:8px 0;display:flex;align-items:center;cursor:pointer;">' +
            '<span style="font-family:var(--font);font-size:20px;font-weight:700;color:' + sdText + ';">' + sdTitle + '</span>' +
          '</div>'
        : '';
      var optsHTML = sdOptions.map(function (opt) {
        return '<div data-shortcut="1" style="width:100%;padding:8px 0;display:flex;align-items:center;cursor:pointer;">' +
          '<span style="font-family:var(--font);font-size:20px;font-weight:500;color:' + sdText + ';">' + opt + '</span>' +
        '</div>';
      }).join('');
      return '<div style="width:100%;height:100%;box-sizing:border-box;' +
        'background:' + sdBg + ';' +
        '-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);' +
        'border-radius:' + _R('widget') + ';padding:24px;' +
        'display:flex;flex-direction:column;gap:24px;align-items:flex-start;overflow:hidden;">' +
        titleHTML +
        '<div style="display:flex;flex-direction:column;gap:24px;width:100%;align-items:flex-start;">' +
          optsHTML +
        '</div>' +
      '</div>';
    }

    // ========================================================================
    // DIALOG ATOMICS (Figma InternetPopOutMenu 3074:6464)
    //   dialog-shell        → rounded glass container (bg + 24px blur)
    //   dialog-site-header  → 50×50 thumb + title + URL + share icon row
    //   dialog-browser-bar  → 5 circular icon buttons with labels
    //   dialog-icon-grid    → 2×4 icon+label grid inside a glass box +
    //                          page-indicator dots
    // These mirror the Dialog overlay's rules-renderer counterparts
    // (app/rules-renderer.js: renderDialogShell/SiteHeader/BrowserBar/
    // IconGrid) so the Dialog overlay can render its components through
    // the same atomic library that backs the Design-tab palette.
    // ========================================================================
    case 'dialog-shell': {
      return '<div style="width:100%;height:100%;' +
        'background:rgba(23,23,26,0.6);' +
        '-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);' +
        'border-radius:' + _R('dialog') + ';box-sizing:border-box;' +
        'box-shadow:0 16px 48px rgba(0,0,0,0.35);"></div>';
    }

    case 'dialog-site-header': {
      var dshv = (comp && comp.variant) || {};
      var dshTitle = dshv.siteName || dshv.title || 'One UI Design Kit';
      var dshUrl   = dshv.siteDesc || dshv.url   || 'https://www.figma.com/community/file/oneui';
      return (
        '<div style="width:100%;height:100%;display:flex;flex-direction:column;gap:12px;padding:8px 8px 0;box-sizing:border-box;">' +
          '<div style="display:flex;align-items:center;gap:15px;">' +
            '<div style="width:50px;height:50px;border-radius:' + _R('widget') + ';background:linear-gradient(135deg,#4A5568,#2D3748);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;">\u25A3</div>' +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;">' +
              '<div style="font-family:var(--font);font-size:18px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;">' + dshTitle + '</div>' +
              '<div style="font-family:var(--font);font-size:14px;font-weight:500;color:#848487;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;">' + dshUrl + '</div>' +
            '</div>' +
            '<div style="width:42px;height:42px;border-radius:' + _R('widget') + ';background:#17171a;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4l-4 4M12 4l4 4M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>' +
            '</div>' +
          '</div>' +
          '<div style="height:1px;background:#5f5f61;width:100%;"></div>' +
        '</div>'
      );
    }

    case 'dialog-browser-bar': {
      var dbbActions = [
        { label: 'History',   svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7L3 7M3 3v4h4M12 7v5l3.5 2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>' },
        { label: 'Downloads', svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4v12M6 12l6 6 6-6M4 20h16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>' },
        { label: 'Galaxy AI', svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3zM18 15l.9 2.2L21 18l-2.1.8L18 21l-.9-2.2L15 18l2.1-.8L18 15z" fill="#fff"/></svg>' },
        { label: 'Add page',  svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>' },
        { label: 'Settings',  svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.6"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>' }
      ];
      var dbbCells = dbbActions.map(function (a) {
        return '<div data-shortcut="1" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">' +
          '<div style="width:54px;height:54px;border-radius:48px;background:#17171a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 4.7px rgba(0,0,0,0.25);">' + a.svg + '</div>' +
          '<div style="font-family:var(--font);font-size:var(--font-size-xs,14px);font-weight:500;color:#fff;text-align:center;line-height:1.2;white-space:nowrap;">' + a.label + '</div>' +
        '</div>';
      }).join('');
      return '<div style="width:100%;height:100%;display:flex;align-items:flex-start;justify-content:space-between;padding:0 8px;box-sizing:border-box;">' +
        dbbCells +
      '</div>';
    }

    case 'dialog-icon-grid': {
      var digApps = [
        { name: 'Videos',     svg: '<rect x="3" y="5" width="18" height="12" rx="1.5" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M10 9l5 3-5 3V9z" fill="#fff"/>' },
        { name: 'Extensions', svg: '<path d="M8 3v3h8V3M3 8h3v8H3M21 8h-3v8h3M8 21v-3h8v3M6 9v6h12V9H6z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>' },
        { name: 'Block ads',  svg: '<circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M5 5l14 14" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>' },
        { name: 'Privacy',    svg: '<path d="M12 3l7 3v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V6l7-3z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>' },
        { name: 'Brightness', svg: '<circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>' },
        { name: 'Find',       svg: '<circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M16 16l4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>' },
        { name: 'Text',       svg: '<path d="M5 6h14M12 6v14M9 20h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>' },
        { name: 'Save PDF',   svg: '<rect x="5" y="3" width="14" height="18" rx="1.5" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M15 3v4h4M12 11v6M9 14l3 3 3-3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>' }
      ];
      var digRow = function (slice) {
        return slice.map(function (a) {
          return '<div data-shortcut="1" style="width:54px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;">' +
            '<div style="width:40px;height:28px;display:flex;align-items:center;justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none">' + a.svg + '</svg></div>' +
            '<div style="font-family:var(--font);font-size:var(--font-size-xs,14px);font-weight:500;color:#fff;text-align:center;line-height:1.2;white-space:nowrap;">' + a.name + '</div>' +
          '</div>';
        }).join('');
      };
      return (
        '<div style="width:100%;height:100%;background:rgba(23,23,26,0.6);border-radius:' + _R('widget') + ';padding:18px 20px 16px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">' +
          '<div style="display:flex;justify-content:space-between;width:100%;">' + digRow(digApps.slice(0, 4)) + '</div>' +
          '<div style="display:flex;justify-content:space-between;width:100%;">' + digRow(digApps.slice(4, 8)) + '</div>' +
          '<div style="display:flex;justify-content:center;align-items:center;gap:6px;">' +
            '<div style="width:6px;height:6px;border-radius:5px;background:#ffffff;"></div>' +
            '<div style="width:6px;height:6px;border-radius:5px;background:rgba(255,255,255,0.6);"></div>' +
          '</div>' +
        '</div>'
      );
    }

    case 'search-bar': {
      // Randomly picks one of 4 Figma search-bar variants + one of 10
      // natural-sounding prompts. Renders as an actual <input> so the
      // user can type — styled to match Figma exactly (bg/text/mic).
      //
      // Figma variants (kxDvBUif6pV502Si4RPidK):
      //   47:221  — dark solid (#17171a bg, white text)
      //   547:9639 — light solid (#fcfcff bg, black text)
      //   47:228  — Galaxy-AI dark gradient (with blue→green gradient text)
      //   547:9646 — Galaxy-AI light gradient
      //
      // variant.style can pin a specific one ('dark'|'light'|'ai-dark'|
      // 'ai-light'); otherwise it's random per render.
      var sbc = (comp && comp.content) || {};
      var sbv = (comp && comp.variant) || {};
      var SEARCH_PROMPTS = [
        'What are you searching for?',
        'What do you need?',
        'What would you like to find?',
        'What are you trying to find?',
        'What can I help you find?',
        'What do you have in mind?',
        'What are you here for?',
        'What are you after?',
        'What are you hoping to discover?',
        'What brings you here today?'
      ];
      var sbPh = sbc.placeholder || sbv.placeholder ||
        SEARCH_PROMPTS[Math.floor(Math.random() * SEARCH_PROMPTS.length)];

      var STYLES = ['dark', 'light', 'ai-dark', 'ai-light'];
      var sbStyle = sbv.style || STYLES[Math.floor(Math.random() * STYLES.length)];
      var __surfStyle = _themeSurfaceStyleRoot();
      if ((__surfStyle === 'flat' || __surfStyle === 'neon') && (sbStyle === 'ai-dark' || sbStyle === 'ai-light')) {
        sbStyle = 'dark';
      }

      // Common shell: 30px rounded pill, px-20 py-17, flex justify-between
      // with 24px mic icon on the right. Background + text color vary.
      var wrapBg, inputColor, inputBgClip, shadow, phColor;
      if (sbStyle === 'light') {
        wrapBg     = 'background:#fcfcff;';
        inputColor = 'color:#000000;';
        inputBgClip = '';
        shadow = '';
        phColor = '#000000';
      } else if (sbStyle === 'ai-dark') {
        wrapBg     = 'background:linear-gradient(to right,#364b6f 0%,#384247 64.807%,#2d2d30 87.168%);';
        inputColor = 'color:transparent;background:linear-gradient(to right,#66a1f3,#22c9a6);-webkit-background-clip:text;background-clip:text;';
        inputBgClip = '';
        shadow = 'box-shadow:-1px 0 4px 1px rgba(78,102,139,0.58);';
        phColor = 'transparent'; // gradient via ::placeholder workaround below
      } else if (sbStyle === 'ai-light') {
        wrapBg     = 'background:linear-gradient(to right,#364b6f 0%,#91b0bf 64.807%,#cfcfcf 87.168%);';
        inputColor = 'color:transparent;background:linear-gradient(to right,#66a1f3,#22c9a6);-webkit-background-clip:text;background-clip:text;';
        inputBgClip = '';
        shadow = 'box-shadow:-1px 0 4px 1px rgba(78,102,139,0.58);';
        phColor = 'transparent';
      } else {
        // dark (default)
        wrapBg     = 'background:#17171a;';
        inputColor = 'color:#ffffff;';
        inputBgClip = '';
        shadow = '';
        phColor = '#ffffff';
      }

      // Unique ID so multiple search-bars on one page don't collide.
      var inputId = 'searchbar-' + Math.random().toString(36).slice(2, 8);
      var isAI = sbStyle === 'ai-dark' || sbStyle === 'ai-light';

      // Mic icon — 24×24, inherits wrap text color (stroke currentColor)
      var micColor = (sbStyle === 'light') ? '#000000' : '#ffffff';
      var micSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:' + micColor + ';"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>';

      // For AI variants, use a separate span that renders the gradient text
      // AND a transparent real input on top for typing. The span shows the
      // placeholder when empty; hidden when user types.
      if (isAI) {
        return '<div style="width:100%;height:100%;' + wrapBg + shadow +
          'border-radius:30px;padding:17px 20px;box-sizing:border-box;' +
          'display:flex;align-items:center;justify-content:space-between;gap:8px;overflow:hidden;position:relative;">' +
          '<div style="flex:1;min-width:0;position:relative;height:22px;">' +
            // Gradient placeholder (shown when input is empty)
            '<span data-sb-gradient-placeholder style="position:absolute;inset:0;display:flex;align-items:center;' +
              'font-family:var(--font);font-size:16px;font-weight:700;line-height:1;' +
              'background:linear-gradient(to right,#66a1f3,#22c9a6);-webkit-background-clip:text;background-clip:text;color:transparent;' +
              'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;">' + sbPh + '</span>' +
            // Real input (transparent text so user sees gradient placeholder,
            // switches to own text once they type)
            '<input id="' + inputId + '" type="text" ' +
              'oninput="this.previousElementSibling.style.display=this.value?\'none\':\'flex\';" ' +
              'style="width:100%;height:100%;background:transparent;border:none;outline:none;' +
              'font-family:var(--font);font-size:16px;font-weight:700;' +
              'background:linear-gradient(to right,#66a1f3,#22c9a6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;' +
              'caret-color:#66a1f3;padding:0;margin:0;"/>' +
          '</div>' +
          micSvg +
        '</div>';
      }

      // Solid variants (dark / light)
      return '<div style="width:100%;height:100%;' + wrapBg +
        'border-radius:30px;padding:17px 20px;box-sizing:border-box;' +
        'display:flex;align-items:center;justify-content:space-between;gap:8px;overflow:hidden;">' +
        '<input id="' + inputId + '" type="text" placeholder="' + sbPh + '" ' +
          'style="flex:1;min-width:0;height:22px;background:transparent;border:none;outline:none;' +
          'font-family:var(--font);font-size:16px;font-weight:700;' + inputColor + 'padding:0;margin:0;' +
          '--sb-ph:' + phColor + ';"/>' +
        micSvg +
      '</div>';
    }

    case 'focus-block': {
      // Variant-aware: widget cells, hero cards, 'secondary' editorial
      // cards, weather cards, or default focus
      var fv = (comp && comp.variant) || {};
      var ftitle = fv.title || 'Focus block';
      var fvalue = fv.value || '';
      var fbody  = fv.body || fv.description || '';
      var fsub   = fv.sub   || (fv.kind === 'hero' ? '' : 'Important content goes here');
      var faccent = fv.accent || 'var(--accent-primary,#0381FE)';

      // Calendar variant — dedicated visual treatment so
      // calendar_summary_card doesn't render as a generic banner. Layout:
      // small section header ("Next up · Today") + small calendar glyph
      // beside a prominent time block, then event title large, location
      // with pin icon at the bottom.
      if (fv.kind === 'calendar') {
        var cTime     = fv.time     || '';
        var cTitle    = fv.title    || 'Event';
        var cLocation = fv.location || '';
        var cDuration = fv.duration || '';
        var cSection  = fv.section  || '';
        // Inline calendar glyph
        var calIcon = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">' +
          '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="#ffffff" strokeWidth="2" fill="none"/>' +
          '<path d="M8 3V7M16 3V7M3.5 10H20.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>' +
          '<rect x="7" y="13" width="10" height="2" rx="1" fill="#ffffff"/>' +
        '</svg>';
        // Build header row (section + duration meta, optional)
        var headerParts = [];
        if (cSection)  headerParts.push('<span>' + cSection + '</span>');
        if (cSection && cDuration) headerParts.push('<span style="opacity:0.5;">·</span>');
        if (cDuration) headerParts.push('<span>' + cDuration + '</span>');
        var headerRow = '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#ffffff;display:flex;gap:4px;align-items:center;text-transform:uppercase;margin-bottom:7px;line-height:1.3;">SEARCH · COFFEE SHOPS</div>';
        // Build time + cal-icon row
        var timeRow = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">' +
          '<div style="width:28px;height:28px;flex-shrink:0;">' + calIcon + '</div>' +
          (cTime ? '<div style="font-family:var(--font);font-size:32px;font-weight:500;line-height:1.3;color:#ffffff;">' + cTime + '</div>' : '') +
        '</div>';
        // Title row
        var titleRow = '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#8DE7E7;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:7px;">' + cTitle + '</div>';
        // Location row
        var locRow = cLocation
          ? '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#C4FAFA;line-height:1.3;">' + cLocation + '</div>'
          : '';
        return '<div style="width:100%;min-height:132px;height:auto;box-sizing:border-box;border-radius:28px;' +
          _G('panel') +
          'padding:24px;box-sizing:border-box;' +
          'display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;position:relative;">' +
          '<div style="position:relative;z-index:1;display:flex;flex-direction:column;justify-content:flex-start;flex-shrink:0;">' +
            headerRow +
            timeRow +
            titleRow +
            locRow +
          '</div>' +
        '</div>';
      }

      // Input-summary variant — for `input_summary_card`. Layout: a small
      // form-input glyph in the corner, section header (uppercase), large
      // topic phrase, and either a single detail line OR a row of facet
      // chips when the value contained separators. Used for search recap,
      // settings change confirmation, address entry summary.
      if (fv.kind === 'input') {
        var iSection = fv.section || 'INPUT';
        var iTopic   = fv.topic   || '';
        var iFacets  = Array.isArray(fv.facets) ? fv.facets : [];
        
        // Render facet chips
        var facetHtml = iFacets.slice(0, 12).map(function (f) {
          return '<span style="padding:8px 16px;background:rgba(236, 238, 247, 0.2);border-radius:999px;' +
            'font-family:var(--font);font-size:14px;font-weight:500;color:#C6FFFF;' +
            'max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f + '</span>';
        }).join('');

        return '<div style="width:100%;min-height:140px;height:auto;border-radius:28px;' +
          _G('panel') +
          'padding:24px;box-sizing:border-box;' +
          'display:flex;flex-direction:column;justify-content:flex-start;overflow:visible;">' +
          // Subtitle (Description)
          '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#ffffff;text-transform:uppercase;margin-bottom:7px;line-height:1.3;">SEARCH · COFFEE SHOPS</div>' +
          // Title (Topic)
          (iTopic
            ? '<div style="font-family:var(--font);font-size:24px;font-weight:500;line-height:1.3;color:#ffffff;margin-bottom:18px;">' + iTopic + '</div>'
            : '') +
          // Chips Row
          '<div style="display:flex;flex-wrap:wrap;gap:5px 10px;justify-content:flex-start;align-content:flex-start;overflow:visible;max-width:100%;margin:0;padding:0;">' + 
            facetHtml + 
          '</div>' +
        '</div>';
      }

      // Forecast / metrics sections: uppercase header + stacked or wrapped
      // glass capsules (hourly timeline, 5-day rows, humidity · wind chips).
      if (fv.kind === 'chip_section') {
        var csTitle = fv.title || 'Section';
        var csLines = Array.isArray(fv.lines) ? fv.lines : [];
        var csWrap = !!fv.wrap;
        var escCS = function (t) {
          return String(t)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        };
        var miniSq = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="3" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3"/></svg>';
        var pillStyle = 'width:100%;align-self:stretch;padding:12px 16px;border-radius:999px;background:rgba(255,255,255,0.13);' +
          'border:1px solid rgba(255,255,255,0.16);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
          'font-size:16px;font-weight:500;font-family:var(--font);color:var(--text-primary,#fff);text-align:center;' +
          'max-width:100%;min-width:0;box-sizing:border-box;line-height:1.42;white-space:normal;overflow-wrap:break-word;word-break:normal;';
        var pillsHtml = csLines.map(function (line) {
          return '<div style="' + pillStyle + '">' + escCS(line) + '</div>';
        }).join('');
        var bodyCS = csWrap
          ? '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-content:center;width:100%;">' + pillsHtml + '</div>'
          : '<div style="display:flex;flex-direction:column;align-items:stretch;gap:10px;width:100%;">' + pillsHtml + '</div>';
        return '<div style="width:100%;min-height:112px;height:auto;border-radius:var(--card-radius,' + _R('widget') + ');' +
          _G('panel') +
          'padding:' + _S('xxl') + ' ' + _S('4xl') + ' ' + '22px;box-sizing:border-box;display:flex;flex-direction:column;gap:' + _S('xl') + ';overflow:visible;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">' +
            '<div style="width:14px;height:14px;flex-shrink:0;opacity:0.88;">' + miniSq + '</div>' +
            '<div style="' + _T('label', { weight: 'medium', color: 'translucentLabel' }) + 'letter-spacing:0.4px;text-transform:uppercase;text-align:center;">' + escCS(csTitle) + '</div>' +
          '</div>' +
          bodyCS +
        '</div>';
      }

      // Reminder variant — checkbox + task title + due time, with an
      // orange accent for the section header. Sample Samsung One UI
      // reminder widget layout.
      if (fv.kind === 'reminder') {
        var rTask    = fv.task    || 'Reminder';
        var rDue     = fv.due     || '';
        var rSection = fv.section || (fv.count ? fv.count + ' ITEMS' : 'TODAY');
        // Hollow checkbox SVG — accent driven by theme var
        var checkBox = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">' +
          '<rect x="4" y="4" width="16" height="16" rx="4" stroke="var(--card-reminder-accent,#F59E0B)" strokeWidth="1.8" fill="color-mix(in srgb, var(--card-reminder-accent,#F59E0B) 12%, transparent)"/>' +
        '</svg>';
        var clockIcon = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">' +
          '<circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>' +
          '<path d="M12 7v5l3 2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>' +
        '</svg>';
        return '<div style="width:100%;min-height:104px;height:100%;border-radius:28px;' +
          _G('panel') +
          'padding:24px;box-sizing:border-box;' +
          'display:flex;flex-direction:column;justify-content:center;overflow:hidden;">' +
          // Header: checkbox + section
          '<div style="display:flex;align-items:center;gap:4px;margin-bottom:7px;">' +
            '<div style="width:18px;height:18px;flex-shrink:0;">' + checkBox + '</div>' +
            '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#ffffff;letter-spacing:0.35px;text-transform:uppercase;line-height:1.3;">' + rSection + '</div>' +
          '</div>' +
          // Task title
          '<div style="font-family:var(--font);font-size:20px;font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#ffffff;margin-bottom:9px;">' + rTask + '</div>' +
          // Due time row (aligned with calendar location style per user request)
          (rDue
            ? '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#C4FAFA;line-height:1.3;">' + (rDue.toLowerCase().startsWith('due') ? rDue : 'Due ' + rDue) + '</div>'
            : '') +
        '</div>';
      }

      // Message summary variant — avatar circle + sender + preview.
      // Green accent for "new messages" section header.
      if (fv.kind === 'message') {
        var mSender  = fv.sender  || '';
        var mPreview = fv.preview || '(no preview)';
        var mSection = fv.section || 'MESSAGES';
        // Avatar — colored circle with first letter of sender (or chat
        // bubble glyph when no sender)
        var avatarLetter = mSender ? mSender.charAt(0).toUpperCase() : '';
        var avatar = avatarLetter
          ? '<div style="width:min(var(--card-message-avatar-size,32px),28px);height:min(var(--card-message-avatar-size,32px),28px);border-radius:50%;background:var(--card-message-avatar-grad,linear-gradient(135deg,#34D399,#10B981));display:flex;align-items:center;justify-content:center;color:var(--text-primary,#fff);font-weight:700;font-size:var(--font-size-sm,16px);flex-shrink:0;">' + avatarLetter + '</div>'
          : '<div style="width:min(var(--card-message-avatar-size,32px),28px);height:min(var(--card-message-avatar-size,32px),28px);border-radius:50%;background:var(--card-message-avatar-grad,linear-gradient(135deg,#34D399,#10B981));display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-1.4 3.5A8 8 0 0 1 21 12z" fill="#fff"/></svg>' +
            '</div>';
        return '<div style="width:100%;min-height:118px;height:auto;border-radius:28px;' +
          _G('panel') +
          'padding:24px;box-sizing:border-box;' +
          'display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;">' +
          // Header
          '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#ffffff;letter-spacing:0.35px;text-transform:uppercase;margin-bottom:7px;line-height:1.3;">' + mSection + '</div>' +
          // Body: avatar + (sender + preview)
          '<div style="display:flex;align-items:flex-start;gap:10px;">' +
            avatar +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px;">' +
              (mSender
                ? '<div style="font-family:var(--font);font-size:20px;font-weight:500;color:#ffffff;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + mSender + '</div>'
                : '') +
              '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#8DE7E7;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">' + mPreview + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      // ETA variant — route icon + large duration + destination + traffic.
      // Teal accent for the navigation context.
      if (fv.kind === 'eta') {
        var eEta         = fv.eta         || '—';
        var eDestination = fv.destination || '';
        var eTraffic     = fv.traffic     || '';
        var eRoute       = fv.route       || '';
        // Trafficaccent: green for light, amber for moderate, red for heavy
        var trafficColor = '#10B981';  // light (default)
        if (/heavy|severe/i.test(eTraffic)) trafficColor = '#EF4444';
        else if (/moderate/i.test(eTraffic)) trafficColor = '#F59E0B';
        var carIcon = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">' +
          '<path d="M5 17h14M7 17l1.5-5h7L17 17M6 17v2M18 17v2" stroke="var(--card-eta-accent,#14B8A6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>' +
          '<circle cx="9" cy="14" r="0.8" fill="var(--card-eta-accent,#14B8A6)"/>' +
          '<circle cx="15" cy="14" r="0.8" fill="var(--card-eta-accent,#14B8A6)"/>' +
        '</svg>';
        var pinIcon = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" style="display:block;">' +
          '<path d="M12 22s7-7.58 7-13a7 7 0 0 0-14 0c0 5.42 7 13 7 13z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/>' +
          '<circle cx="12" cy="9" r="2.2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>' +
        '</svg>';
        return '<div style="width:100%;min-height:104px;height:100%;border-radius:28px;' +
          _G('panel') +
          'padding:24px;box-sizing:border-box;' +
          'display:flex;flex-direction:column;justify-content:center;overflow:hidden;">' +
          // Top: car icon + huge ETA
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">' +
            '<div style="width:28px;height:28px;flex-shrink:0;">' + carIcon + '</div>' +
            '<div style="font-family:var(--font);font-size:32px;font-weight:500;line-height:1.3;color:#ffffff;letter-spacing:-0.7px;">' + eEta + '</div>' +
          '</div>' +
          // Mid: destination
          (eDestination
            ? '<div style="display:flex;align-items:center;gap:4px;margin-bottom:7px;">' +
                '<div style="width:14px;height:14px;flex-shrink:0;opacity:0.7;">' + pinIcon + '</div>' +
                '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#ffffff;line-height:1.3;">' + eDestination + '</div>' +
              '</div>'
            : '') +
          // Bottom: route info (traffic status removed, "via" stripped per user request)
          ((eRoute || eTraffic)
            ? '<div style="font-family:var(--font);font-size:16px;font-weight:500;color:#8DE7E7;line-height:1.3;">' + (eRoute ? eRoute.replace(/^via\s+/i, '') : eTraffic) + '</div>'
            : '') +
        '</div>';
      }

      // Tier 2.1 — Condition-aware background gradient for weather cards.
      // Replaces the flat glass surface with a dynamic sky-like color
      // that responds to the weather condition. Real Samsung weather
      // widgets use full-card imagery; this is a CSS-only equivalent
      // (no network calls, no images to load) that captures ~60% of
      // the visual richness for ~5% of the cost.
      function _weatherBgGradient(icon) {
        var I = (icon || '').toLowerCase();
        // Strong, visible gradients — these are the weather card's
        // identity. Previously too subtle (0.18-0.32 alpha); bumped
        // to 0.45-0.65 so the sun/cloud/rain identity reads at a
        // glance. Final stop blends to dark surface so text contrast
        // stays readable.
        switch (I) {
          case 'sun':
          case 'clear':
            return 'linear-gradient(155deg, rgba(251,191,36,0.62) 0%, rgba(249,115,22,0.40) 55%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'cloud-sun':
          case 'partly-cloudy':
            return 'linear-gradient(155deg, rgba(251,191,36,0.48) 0%, rgba(180,180,195,0.30) 50%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'cloud':
          case 'overcast':
            return 'linear-gradient(155deg, rgba(180,180,195,0.42) 0%, rgba(120,125,140,0.28) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'rain':
          case 'showers':
          case 'drizzle':
            return 'linear-gradient(155deg, rgba(96,165,250,0.55) 0%, rgba(51,65,85,0.35) 55%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'snow':
          case 'sleet':
            return 'linear-gradient(155deg, rgba(226,232,240,0.55) 0%, rgba(148,163,184,0.32) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'bolt':
          case 'storm':
          case 'thunderstorm':
            return 'linear-gradient(155deg, rgba(251,191,36,0.40) 0%, rgba(71,85,105,0.55) 45%, color-mix(in srgb, var(--page-bg,#171717) 78%, transparent) 100%)';
          case 'fog':
          case 'mist':
          case 'haze':
            return 'linear-gradient(155deg, rgba(180,180,195,0.36) 0%, rgba(120,125,140,0.26) 50%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'wind':
          case 'windy':
            return 'linear-gradient(155deg, rgba(165,180,252,0.45) 0%, rgba(120,125,140,0.28) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          default:
            return '';
        }
      }

      /** Grayscale-only sky fills when `--oneui-chroma: mono` is active. */
      function _weatherBgGradientMono(icon) {
        var I = (icon || '').toLowerCase();
        switch (I) {
          case 'sun':
          case 'clear':
            return 'linear-gradient(155deg, rgba(205,205,210,0.40) 0%, rgba(125,125,130,0.30) 55%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'cloud-sun':
          case 'partly-cloudy':
            return 'linear-gradient(155deg, rgba(185,185,190,0.36) 0%, rgba(110,110,115,0.28) 50%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'cloud':
          case 'overcast':
            return 'linear-gradient(155deg, rgba(155,155,160,0.38) 0%, rgba(85,85,90,0.26) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'rain':
          case 'showers':
          case 'drizzle':
            return 'linear-gradient(155deg, rgba(145,148,155,0.40) 0%, rgba(65,68,74,0.32) 55%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'snow':
          case 'sleet':
            return 'linear-gradient(155deg, rgba(210,210,215,0.42) 0%, rgba(130,132,138,0.30) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'bolt':
          case 'storm':
          case 'thunderstorm':
            return 'linear-gradient(155deg, rgba(175,175,180,0.36) 0%, rgba(70,72,78,0.34) 45%, color-mix(in srgb, var(--page-bg,#171717) 78%, transparent) 100%)';
          case 'fog':
          case 'mist':
          case 'haze':
            return 'linear-gradient(155deg, rgba(150,150,155,0.34) 0%, rgba(88,90,95,0.26) 50%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          case 'wind':
          case 'windy':
            return 'linear-gradient(155deg, rgba(165,165,172,0.36) 0%, rgba(95,98,105,0.28) 60%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
          default:
            return 'linear-gradient(155deg, rgba(170,170,176,0.36) 0%, rgba(95,95,100,0.28) 55%, color-mix(in srgb, var(--page-bg,#171717) 72%, transparent) 100%)';
        }
      }

      // Weather variant — dedicated visual treatment so weather_glance_card
      // doesn't render as a generic title+sub box. Layout: condition icon
      // beside a large temp number, condition phrase below, location +
      // feels-like meta at the bottom. THEME-DRIVEN: every visual property
      // pulls from a CSS variable (e.g. --card-weather-temp-size) so the
      // /customize dropdown can swap the entire visual identity at runtime
      // without touching this code.
      if (fv.kind === 'weather') {
        var wTemp      = fv.temp      || '—';
        var wCondition = fv.condition || '';
        var wLocation  = fv.location  || '';
        var wFeels     = fv.feels     || '';
        var wIcon      = _weatherIconSvg(fv.icon || 'sun');
        var themeSurface = _themeSurfaceStyleRoot();
        var wDate = fv.date || 'Tue, Apr 14';
        var wTime = fv.time || '3:16';
        var wWind = fv.wind || 'Wind 5 mph';
        var wBgStyle;
        if (_isMonoChromaRoot()) {
          wBgStyle = 'background:linear-gradient(180deg,rgba(111,111,117,0.86) 0%,rgba(155,155,160,0.78) 100%), color-mix(in srgb, var(--page-bg,#171717) 26%, transparent);-webkit-backdrop-filter:blur(18px) saturate(1.12);backdrop-filter:blur(18px) saturate(1.12);border:1px solid rgba(255,255,255,0.18);box-shadow:inset 0 1px 0 rgba(255,255,255,0.22), var(--surface-shadow, none);';
        } else if (themeSurface === 'flat' || themeSurface === 'neon') {
          wBgStyle = 'background:var(--surface-bg, rgba(23,23,26,0.80));-webkit-backdrop-filter:var(--surface-filter, blur(24px));backdrop-filter:var(--surface-filter, blur(24px));border:var(--surface-border, 1px solid rgba(255,255,255,0.06));box-shadow:var(--surface-shadow, none);';
        } else if (themeSurface === 'base') {
          wBgStyle = 'background:linear-gradient(180deg,rgba(63,136,221,0.86) 0%,rgba(112,177,230,0.78) 100%), color-mix(in srgb, var(--page-bg,#171717) 28%, transparent);-webkit-backdrop-filter:blur(18px) saturate(1.16);backdrop-filter:blur(18px) saturate(1.16);border:1px solid rgba(255,255,255,0.20);box-shadow:inset 0 1px 0 rgba(255,255,255,0.24), 0 18px 42px rgba(30,93,160,0.28);';
        } else {
          wBgStyle = _G('panel');
        }
        var wGlassSheen = (themeSurface === 'flat' || themeSurface === 'neon') ? '' : '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.18),transparent 42%,rgba(0,0,0,0.08));pointer-events:none;"></div>';
        var wInsetBorder = 'inset 0 0 0 1px ' + (themeSurface === 'neon' ? 'rgba(5,8,5,0.10)' : 'rgba(255,255,255,0.08)');
        var wIconBox = 'width:32px;height:32px;flex-shrink:0;';
        return '<div style="width:100%;min-height:0;height:auto;align-self:stretch;flex:0 1 auto;border-radius:28px;' +
          wBgStyle +
          'padding:24px;box-sizing:border-box;color:#ffffff;' +
          'display:flex;flex-direction:column;overflow:visible;position:relative;font-family:var(--font);">' +
          wGlassSheen +
          '<div style="position:absolute;inset:1px;border-radius:27px;box-shadow:' + wInsetBorder + ';pointer-events:none;"></div>' +
          '<div style="position:relative;z-index:1;display:flex;flex-direction:row;justify-content:space-between;align-items:flex-start;gap:12px;min-width:0;margin-bottom:18px;">' +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;">' +
              '<div style="font-size:32px;font-weight:500;line-height:1.3;color:#ffffff;max-width:100%;white-space:nowrap;word-break:normal;overflow-wrap:normal;margin-bottom:7px;">' + wTemp + '</div>' +
              (wLocation ? '<div style="font-size:16px;font-weight:500;line-height:1.3;color:#ffffff;display:flex;align-items:flex-start;gap:4px;min-width:0;max-width:100%;word-break:normal;overflow-wrap:break-word;"><span style="font-size:16px;flex-shrink:0;">⊙</span><span style="min-width:0;">' + wLocation + '</span></div>' : '') +
            '</div>' +
            '<div style="position:relative;z-index:1;' + wIconBox + 'filter:drop-shadow(0 3px 4px rgba(0,0,0,0.18));">' +
              '<div style="width:100%;height:100%;">' + wIcon + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="position:relative;z-index:1;display:flex;flex-direction:row;justify-content:space-between;align-items:flex-end;gap:12px;min-width:0;margin:0;padding-top:18px;border-top:1px solid rgba(255,255,255,0.14);">' +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;">' +
              (wCondition ? '<div style="font-size:16px;font-weight:500;line-height:1.3;color:#8DE7E7;max-width:100%;word-break:normal;overflow-wrap:break-word;">' + wCondition + '</div>' : '') +
              '<div style="font-size:16px;font-weight:500;line-height:1.3;color:#C4FAFA;max-width:100%;word-break:normal;overflow-wrap:break-word;">' + (wFeels ? 'Feels ' + wFeels : wWind) + '</div>' +
            '</div>' +
            '<div style="flex-shrink:0;max-width:48%;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:7px;min-width:0;">' +
              '<div style="font-size:16px;font-weight:500;line-height:1.3;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + wDate + '</div>' +
              '<div style="font-size:32px;font-weight:500;line-height:1.3;color:#ffffff;white-space:nowrap;word-break:normal;">' + wTime + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      if (fv.kind === 'hero') {
        return '<div style="width:100%;height:100%;border-radius:' + _R('widget') + ';' +
          _G('panel') +
          'display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;">' +
          '<div style="width:60px;height:60px;border-radius:50%;background:' + faccent + ';opacity:0.6;"></div>' +
        '</div>';
      }
      // 'secondary' editorial card: title + body paragraph, no dot.
      // Used for Detail-screen focus-block stacks where every card should
      // read as a short article block (title + 1-2 line copy).
      if (fv.kind === 'secondary') {
        return '<div style="width:100%;min-height:0;height:auto;border-radius:' + _R('widget') + ';' +
          _G('panel') +
          'padding:20px 22px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;overflow:visible;">' +
          '<div style="' + _T('large', { weight: 'bold' }) + 'line-height:1.25;max-width:100%;word-wrap:break-word;">' + ftitle + '</div>' +
          (fbody ? '<div style="' + _T('label', { color: 'translucentLabel' }) +
            'font-size:16px;line-height:1.45;max-width:100%;word-wrap:break-word;overflow-wrap:anywhere;overflow:visible;">' + fbody + '</div>' : '') +
        '</div>';
      }
      // Widget-style cell (focus-block-group expansion)
      if (fv.kind) {
        return '<div style="width:100%;min-height:0;height:auto;border-radius:' + _R('widget') + ';' +
          _G('panel') +
          'padding:' + _S('lg') + ';box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;gap:' + _S('sm') + ';overflow:visible;">' +
          '<div style="display:flex;justify-content:center;align-items:center;gap:8px;width:100%;flex-wrap:wrap;">' +
            '<div style="' + _T('label', { color: 'translucentLabel' }) + 'min-width:0;flex:0 1 auto;max-width:100%;word-wrap:break-word;overflow-wrap:anywhere;line-height:1.3;text-align:center;">' + ftitle + '</div>' +
            '<div style="width:8px;height:8px;border-radius:50%;background:' + faccent + ';flex-shrink:0;"></div>' +
          '</div>' +
          (fvalue ? '<div style="' + _T('large', { weight: 'bold' }) + 'line-height:1.2;max-width:100%;word-wrap:break-word;overflow-wrap:anywhere;text-align:center;">' + fvalue + '</div>' : '') +
          (fsub ? '<div style="' + _T('label', { color: 'sectionLabel' }) + 'max-width:100%;word-wrap:break-word;line-height:1.35;text-align:center;">' + fsub + '</div>' : '') +
        '</div>';
      }
      // Default focus-block
      return '<div style="width:100%;min-height:0;height:auto;border-radius:' + _R('widget') + ';' +
        _G('panel') +
        'padding:' + _S('3xl') + ';box-sizing:border-box;overflow:visible;">' +
        '<div style="' + _T('large', { weight: 'bold' }) + 'max-width:100%;word-wrap:break-word;">' + ftitle + '</div>' +
        (fsub ? '<div style="' + _T('label', { color: 'translucentLabel' }) + 'margin-top:' + _S('sm') + ';max-width:100%;word-wrap:break-word;line-height:1.35;">' + fsub + '</div>' : '') +
      '</div>';
    }

    case 'list-item': {
      // Mirrors the `notif-card` atomic (Figma Notification/Regular 544:1088)
      // with two theme variants:
      //   theme='light' (default) → bg #ffffff, text #000 — List screen
      //   theme='dark'            → bg rgba(23,23,26,0.6), text #efeef2 —
      //     used in Detail screen where the group sits in a glass shell
      //
      // Shared layout: rounded 50 pill, 56 icon, title+time row, subtitle
      // below, trailing chevron or badge pill.
      var lv = (comp && comp.variant) || {};
      var liTheme  = lv.theme === 'dark' ? 'dark' : 'light';
      var title    = lv.title    || 'Item';
      var subtitle = lv.subtitle || '';
      var time     = lv.time     || '';
      var avatar   = lv.avatar   || null;
      var glyph    = lv.glyph    || title.charAt(0).toUpperCase();
      var accent   = lv.accent   || '#4285F4';
      var badge    = lv.badge;

      var liBg, liTitleColor, liTimeColor, liSubColor, liChevColor;
      if (liTheme === 'dark') {
        liBg         = 'rgba(23,23,26,0.6)';
        liTitleColor = '#efeef2';
        liTimeColor  = '#d5d5d5';
        liSubColor   = '#cfcccf';
        liChevColor  = '#ffffff';
      } else {
        liBg         = '#ffffff';
        liTitleColor = '#000000';
        liTimeColor  = '#555555';
        liSubColor   = '#333333';
        liChevColor  = '#222222';
      }

      var iconHTML = avatar
        ? '<img src="app-icons/' + avatar + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>'
        : '<div style="width:56px;height:56px;border-radius:50%;background:' + accent +
            ';display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
            'color:#fff;font-size:22px;font-weight:700;line-height:1;">' + glyph + '</div>';

      var trailingHTML = (badge != null && badge > 0)
        ? '<div style="min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#FF3B30;' +
            'display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;' +
            'font-size:var(--font-size-xs,14px);font-weight:700;font-family:Inter,system-ui,sans-serif;">' + badge + '</div>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;opacity:0.8;"><path d="M6 9l6 6 6-6" stroke="' + liChevColor + '" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>';

      return '<div style="width:100%;height:100%;background:' + liBg + ';border-radius:var(--card-radius,' + _R('widget') + ');' +
        'padding:15px 20px 15px 16px;box-sizing:border-box;' +
        'display:flex;align-items:center;gap:10px;overflow:hidden;font-family:var(--font);">' +
        iconHTML +
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">' +
          '<div style="display:flex;align-items:baseline;gap:8px;white-space:nowrap;overflow:hidden;">' +
            '<span style="font-size:var(--font-size-md,18px);font-weight:700;color:' + liTitleColor + ';overflow:hidden;text-overflow:ellipsis;">' + title + '</span>' +
            (time ? '<span style="font-size:var(--font-size-sm,16px);font-weight:500;color:' + liTimeColor + ';flex-shrink:0;">' + time + '</span>' : '') +
          '</div>' +
          (subtitle
            ? '<div style="font-size:var(--font-size-sm,16px);font-weight:500;color:' + liSubColor + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">' + subtitle + '</div>'
            : '') +
        '</div>' +
        trailingHTML +
      '</div>';
    }

    case 'paragraph': {
      var pv = (comp && comp.variant) || {};
      var ptxt = pv.text || '';
      if (pv.kind === 'title') {
        return '<div style="width:100%;height:100%;display:flex;align-items:center;">' +
          '<div style="' + _T('headline', { weight: 'bold' }) + 'line-height:1.2;">' + ptxt + '</div>' +
        '</div>';
      }
      return '<div style="width:100%;height:100%;display:flex;align-items:flex-start;">' +
        '<div style="' + _T('body', { color: 'translucentLabel' }) + 'line-height:1.5;">' + ptxt + '</div>' +
      '</div>';
    }

    case 'action-row': {
      // Reads an action list: variant.actions / content.actions, or legacy
      // variant.primary | variant.secondary (when not placeholders).
      // Optional previewGallery:true → toolkit-only stacked "Studio" demo.
      var av = (comp && comp.variant) || {};
      var ac = (comp && comp.content) || {};
      var actions = Array.isArray(av.actions) ? av.actions
                  : Array.isArray(ac.actions) ? ac.actions
                  : null;
      if (!actions) {
        // Legacy 2-button form — only honor when actual strings supplied,
        // never the "Primary"/"Secondary" placeholders.
        var hasLegacy = (av.primary && av.primary !== 'Primary') ||
                        (av.secondary && av.secondary !== 'Secondary');
        if (hasLegacy) {
          actions = [];
          if (av.primary)   actions.push({ label: av.primary,   kind: 'primary'   });
          if (av.secondary) actions.push({ label: av.secondary, kind: 'secondary' });
        }
      }

      var previewGallery = av.previewGallery === true || ac.previewGallery === true;

      if (previewGallery) {
        var actionRowSkinG = _themeSurfaceStyleRoot();
        var actionRowNeonG = actionRowSkinG === 'neon';
        // Nested circles/pills must follow theme tokens — not a fixed dark gray.
        // Neon: high-contrast white chips on green surface; other styles: --qs-tile-bg + text tokens.
        var gChipBg = actionRowNeonG
          ? 'var(--qs-chip-off-bg, #ffffff)'
          : 'var(--qs-tile-bg, rgba(23,23,26,0.80))';
        var gChipFg = actionRowNeonG
          ? 'var(--qs-chip-icon-off, var(--text-primary, #050805))'
          : 'var(--text-primary, #efeef2)';
        var gLabelFg = actionRowNeonG
          ? 'var(--text-primary, #050805)'
          : 'var(--text-secondary, rgba(239,238,242,0.7))';
        var gChipBorder = 'var(--surface-border, 1px solid rgba(255,255,255,0.12))';
        var gInsetSquareBg = actionRowNeonG
          ? 'color-mix(in srgb, var(--text-primary,#050805) 10%, transparent)'
          : 'color-mix(in srgb, var(--text-primary,#fff) 18%, transparent)';
        var ACTION_ICONS_G = {
          trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
          settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>'
        };
        var PANEL_ICONS_G = {
          video: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M10 8l5 4-5 4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
          heart: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
          clock: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
          pin: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 21s-6-6.2-6-11a6 6 0 1 1 12 0c0 4.8-6 11-6 11z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8"/></svg>',
          users: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M13.5 16c1.9.2 3.4 1.2 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
          clean: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 14h8M10 12v4M14 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
          trash: ACTION_ICONS_G.trash,
          settings: ACTION_ICONS_G.settings,
          chevron: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>'
        };
        function shortcutG(icon, label) {
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:9px;min-width:0;color:' + gLabelFg + ';">' +
            '<div style="width:54px;height:54px;max-width:100%;aspect-ratio:1;border-radius:50%;background:' + gChipBg + ';border:' + gChipBorder + ';display:flex;align-items:center;justify-content:center;color:' + gChipFg + ';">' + PANEL_ICONS_G[icon] + '</div>' +
            '<div style="font-family:var(--font);font-size:16px;font-weight:500;line-height:1.3;text-align:center;width:100%;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;white-space:normal;color:#ffffff;">' + label + '</div>' +
          '</div>';
        }
        function panelPillG(icon, label, dot) {
          var pillPadDot = dot ? 'padding-right:22px;' : '';
          return '<div style="min-height:64px;border-radius:53px;background:' + gChipBg + ';border:' + gChipBorder + ';display:flex;align-items:center;justify-content:center;color:#ffffff;font-family:var(--font);font-size:16px;font-weight:500;line-height:1.3;position:relative;padding:12px 24px 12px 16px;box-sizing:border-box;' + pillPadDot + '">' +
            '<span style="display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:100%;">' +
              '<span style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;flex:none;">' + PANEL_ICONS_G[icon] + '</span>' +
              '<span style="min-width:0;max-width:100%;text-align:center;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;color:#8DE7E7;">' + label + '</span>' +
            '</span>' +
            (dot ? '<span style="position:absolute;right:16px;top:16px;width:6px;height:6px;border-radius:50%;background:#E65B17;"></span>' : '') +
          '</div>';
        }
        var studioBarBg = gChipBg;
        var studioBarFg = '#ffffff';
        var studioBarChev = '#ffffff';
        var studioBarBorder = gChipBorder;
        var studioTileBg = gInsetSquareBg;
        return '<div style="width:100%;max-width:100%;min-width:0;height:auto;box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;' +
          'padding:24px;gap:18px;background:var(--surface-bg, rgba(23,23,26,0.80));' +
          '-webkit-backdrop-filter:var(--surface-filter, blur(24px));backdrop-filter:var(--surface-filter, blur(24px));border-radius:28px;' +
          'color:var(--text-primary,#fff);font-family:var(--font);overflow:visible;align-self:stretch;">' +
          '<div style="width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;">' +
            shortcutG('video', 'Videos') + shortcutG('heart', 'Favorites') + shortcutG('clock', 'Recent') + shortcutG('pin', 'Locations') +
          '</div>' +
          '<div style="width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">' +
            panelPillG('users', 'Shared albums') + panelPillG('clean', 'Clean out', true) +
            panelPillG('trash', 'Trash') + panelPillG('settings', 'Settings') +
          '</div>' +
          '<div style="width:100%;min-height:64px;border-radius:53px;background:' + studioBarBg + ';border:' + studioBarBorder + ';display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:14px;padding:12px 24px 12px 16px;box-sizing:border-box;color:' + studioBarFg + ';font-size:20px;font-weight:500;font-family:var(--font);line-height:1.3;">' +
            '<span aria-hidden="true"></span>' +
            '<span style="display:inline-flex;align-items:center;gap:16px;justify-content:center;min-width:0;">' +
              '<span style="width:24px;height:24px;border-radius:50%;background:' + studioTileBg + ';flex:none;"></span>' +
              '<span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;">Go to Studio</span>' +
            '</span>' +
            '<span style="display:flex;justify-self:end;color:' + studioBarChev + ';flex-shrink:0;">' + PANEL_ICONS_G.chevron + '</span>' +
          '</div>' +
        '</div>';
      }

      if (!actions || !actions.length) {
        return '<div style="width:100%;height:100%;"></div>';
      }
      // Render each action as a pill chip. The FIRST action gets the
      // filled (primary-accent) style; subsequent ones use glass. If an
      // explicit act.kind === 'override', that chip uses muted outline style.
      var ACTION_ICONS = {
        bookmark:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4v17l6-4 6 4V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
        share:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4" stroke="currentColor" strokeWidth="1.8"/></svg>',
        edit:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 3l5 5-12 12H4v-5L16 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
        trash:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
        copy:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="8" y="4" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
        download:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4v12M6 12l6 6 6-6M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>',
        heart:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21l-9-9a5 5 0 0 1 7-7l2 2 2-2a5 5 0 0 1 7 7l-9 9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
        comment:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 0 1-12 7L3 21l1.5-5A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>',
        play:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z"/></svg>',
        pause:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.5" height="14"/><rect x="13.5" y="5" width="3.5" height="14"/></svg>',
        'skip-forward':'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5l9 7-9 7V5z"/><rect x="16" y="5" width="2.5" height="14"/></svg>',
        'skip-back': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5L10 12l9 7V5z"/><rect x="5.5" y="5" width="2.5" height="14"/></svg>',
        repeat:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 3h4v4M7 21H3v-4M3 11a9 9 0 0 1 15.2-6.7M21 13a9 9 0 0 1-15.2 6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>',
        plus:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>',
        x:           '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>',
        check:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>',
        settings:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
        search:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
        clock:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>',
        pin:         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s-6-6.2-6-11a6 6 0 1 1 12 0c0 4.8-6 11-6 11z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8"/></svg>'
      };
      function _renderActionIcon(name) {
        return name && ACTION_ICONS[name]
          ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;">' + ACTION_ICONS[name] + '</span>'
          : '';
      }
      function _escAttr(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
      }
      function _actionLeadingGlyph(icon) {
        if (icon == null) return '';
        var s = String(icon).trim();
        if (!s) return '';
        if (/^https?:\/\//i.test(s) || /^(app-icons|assets)\//i.test(s) || /^\/(?!\/)/.test(s)) {
          return '<img src="' + _escAttr(s) + '" alt="" style="width:18px;height:18px;object-fit:contain;border-radius:4px;flex-shrink:0;"/>';
        }
        return _renderActionIcon(s);
      }
      var chips = '';
      for (var ai = 0; ai < actions.length; ai++) {
        var act = actions[ai] || {};
        var lbl = String(act.label || act.text || '').trim();
        if (!lbl) continue;
        var ic = act.icon != null ? act.icon : null;
        var lead = _actionLeadingGlyph(ic);
        var kind = act.kind;
        var isPrimary = kind === 'primary' || (!kind && ai === 0 && !/(^|\b)(cancel|dismiss|close|delete|remove)(\b|$)/i.test(lbl));
        var isMuted = kind === 'override';
        var shell;
        if (isMuted) {
          shell = 'background:transparent;color:var(--text-secondary,rgba(255,255,255,0.55));border:1px solid rgba(255,255,255,0.14);';
        } else if (isPrimary) {
          shell = 'background:var(--accent-primary,#0381FE);color:#fff;border:1px solid transparent;box-shadow:0 2px 10px rgba(3,129,254,0.35);';
        } else {
          shell = 'background:rgba(255,255,255,0.09);color:var(--text-primary,#fff);border:1px solid rgba(255,255,255,0.16);';
        }
        chips +=
          '<div data-shortcut="1" role="button" tabindex="0" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;' +
            'padding:12px 16px;border-radius:999px;font-family:var(--font);font-size:15px;font-weight:700;line-height:1.1;' +
            shell + 'flex:0 1 auto;min-width:0;max-width:100%;cursor:default;">' +
            lead +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">' + lbl + '</span>' +
          '</div>';
      }
      if (!chips) {
        return '<div style="width:100%;height:100%;"></div>';
      }
      return '<div style="width:100%;max-width:100%;min-width:0;height:100%;box-sizing:border-box;display:flex;flex-direction:row;flex-wrap:wrap;' +
        'align-items:center;justify-content:center;gap:10px;padding:4px 2px;">' +
        chips +
      '</div>';
    }

    case 'focus-block-group':
      return '<div style="width:100%;height:100%;display:grid;grid-template-columns:1fr 1fr;gap:' + _S('lg') + ';">' +
        '<div style="border-radius:' + _R('widget') + ';' + _G('widgetPill') + '"></div>' +
        '<div style="border-radius:' + _R('widget') + ';' + _G('widgetPill') + '"></div>' +
        '<div style="border-radius:' + _R('widget') + ';' + _G('widgetPill') + '"></div>' +
        '<div style="border-radius:' + _R('widget') + ';' + _G('widgetPill') + '"></div>' +
      '</div>';

    case 'list':
    case 'notification-list':
      // Plain list — 6 simple system-surface rows (used when the list
      // isn't expanded into individual list-item children).
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;gap:' + _S('base') + ';">' +
        Array.from({ length: 6 }).map(() =>
          '<div style="height:56px;border-radius:' + _R('widget') + ';background:#F1F1F3;box-shadow:0 1px 2px rgba(0,0,0,0.08);"></div>'
        ).join('') +
      '</div>';

    case 'detail-content': {
      // Detail screen — "related items" rows use the DARK notif-card
      // variant at rgba(23,23,26,0.6) (30% opacity) and the outer shell
      // also uses rgba(23,23,26,0.6) so the whole section reads as one
      // cohesive dark glass group over the wallpaper/app background.
      var presetItems = [
        { title: 'Lisa Park',    sub: 'Shared a photo · 2 new',  time: '10:32 AM', glyph: 'L', accent: '#E91E63', theme: 'dark' },
        { title: 'Team standup', sub: 'Starts in 15 min · Zoom', time: '9:45 AM',  glyph: 'T', accent: '#4285F4', theme: 'dark' },
        { title: 'Gmail',        sub: 'Re: Q2 planning draft',   time: '8:14 AM',  glyph: 'M', accent: '#EA4335', theme: 'dark' },
        { title: 'Bank',         sub: '\u2212$48.20 at Starbucks', time: '7:02 AM', glyph: '$', accent: '#00A86B', theme: 'dark' }
      ];
      var cardsHTML = presetItems.map(function (it) {
        return '<div style="height:86px;">' +
          window.renderAtomicForRole(
            { role: 'list-item', variant: it },
            { w: 0, h: 86 }
          ) +
        '</div>';
      }).join('');
      return '<div style="width:100%;height:100%;' +
        'background:rgba(23,23,26,0.6);' +
        '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);' +
        'border:1px solid rgba(255,255,255,0.08);border-radius:' + _R('widget') + ';' +
        'padding:10px;box-sizing:border-box;overflow:hidden;' +
        'display:flex;flex-direction:column;gap:6px;">' +
        cardsHTML +
      '</div>';
    }

    case 'bottom-navigation': {
      var bnc = (comp && comp.content) || {};
      var tabs = Array.isArray(bnc.tabs) ? bnc.tabs : ['Home','Explore','Saved','Profile'];
      var activeIdx = bnc.activeIndex != null ? bnc.activeIndex : 0;

      // Returns a SVG path pair: { outline, filled } for active/inactive state.
      // Samsung One UI bottom-nav: filled variant on active, outline on rest.
      function navIconFor(name, active) {
        var lc = (name || '').toLowerCase();
        var c = 'currentColor';
        var sw = active ? '0' : '1.7';
        var fill = active ? c : 'none';
        var s = 'width="22" height="22" viewBox="0 0 24 24"';

        if (/home|main|for.you/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9z" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round"/></svg>';
        }
        if (/search|explore|discover|browse|find/.test(lc)) {
          return '<svg ' + s + ' fill="none"><circle cx="11" cy="11" r="7" stroke="' + c + '" strokeWidth="' + (active ? '2.2' : '1.7') + '" fill="' + (active ? c : 'none') + '" fillOpacity="' + (active ? '0.18' : '0') + '"/><path d="M20 20l-3.5-3.5" stroke="' + c + '" strokeWidth="' + (active ? '2.4' : '1.7') + '" strokeLinecap="round"/></svg>';
        }
        if (/save|bookmark|wishlist|favorite|favour|like|heart/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round"/></svg>';
        }
        if (/profile|account|me|user/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><circle cx="12" cy="8" r="3.5" stroke="' + c + '" strokeWidth="' + sw + '"/><path d="M5 20a7 7 0 0 1 14 0" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinecap="round" fill="' + fill + '"/></svg>';
        }
        if (/message|chat|inbox|mail/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><path d="M4 6h16v10H8l-4 4V6z" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round"/></svg>';
        }
        if (/cart|shop|buy/.test(lc)) {
          return '<svg ' + s + ' fill="none"><path d="M4 5h2l2 12h11l2-8H7" stroke="' + c + '" strokeWidth="' + (active ? '2.2' : '1.7') + '" strokeLinejoin="round" fill="' + (active ? c : 'none') + '" fillOpacity="' + (active ? '0.18' : '0') + '"/><circle cx="10" cy="20" r="1.6" fill="' + c + '"/><circle cx="17" cy="20" r="1.6" fill="' + c + '"/></svg>';
        }
        if (/album|gallery|photo|media|library/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><rect x="4" y="5" width="16" height="14" rx="2" stroke="' + c + '" strokeWidth="' + sw + '"/><circle cx="9" cy="10" r="1.5" stroke="' + c + '" fill="' + (active ? '#fff' : 'none') + '" strokeWidth="' + sw + '"/><path d="M4 16l5-5 4 4 3-3 4 4" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round" fill="none"/></svg>';
        }
        if (/play|music|listen/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><path d="M8 5l12 7-12 7V5z" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round"/></svg>';
        }
        if (/notif|alert|bell/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z" stroke="' + c + '" strokeWidth="' + sw + '" strokeLinejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" stroke="' + c + '" strokeWidth="1.7" strokeLinecap="round" fill="none"/></svg>';
        }
        if (/settings|gear|pref/.test(lc)) {
          return '<svg ' + s + ' fill="' + fill + '"><circle cx="12" cy="12" r="3" stroke="' + c + '" strokeWidth="' + sw + '"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="' + c + '" strokeWidth="1.7" strokeLinecap="round"/></svg>';
        }
        if (/add|plus|create|new/.test(lc)) {
          return '<svg ' + s + ' fill="none"><circle cx="12" cy="12" r="9" stroke="' + c + '" strokeWidth="' + (active ? '2.2' : '1.7') + '" fill="' + (active ? c : 'none') + '" fillOpacity="' + (active ? '0.18' : '0') + '"/><path d="M12 8v8M8 12h8" stroke="' + c + '" strokeWidth="' + (active ? '2.2' : '1.7') + '" strokeLinecap="round"/></svg>';
        }
        // Fallback — solid dot when active, ring when inactive
        return '<svg ' + s + ' fill="' + fill + '"><circle cx="12" cy="12" r="5" stroke="' + c + '" strokeWidth="' + sw + '"/></svg>';
      }

      var tabsHTML = tabs.slice(0, 5).map(function (t, i) {
        var active = i === activeIdx;
        var label = (t && typeof t === 'object') ? (t.label || t.text || '') : String(t);
        var styleLbl = active
          ? _T('label', { weight: 'semibold' })
          : _T('label', { color: 'sectionLabel' });
        return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:1;' +
          (active ? 'color:#fff;' : 'color:rgba(255,255,255,0.55);') +
        '">' +
          '<div style="display:flex;align-items:center;justify-content:center;line-height:0;">' + navIconFor(label, active) + '</div>' +
          '<span style="' + styleLbl + '">' + label + '</span>' +
        '</div>';
      }).join('');

      return '<div style="width:100%;height:100%;border-radius:var(--card-radius,' + _R('widget') + ');' +
        _G('widgetPill') +
        'display:flex;align-items:stretch;padding:6px 4px;box-sizing:border-box;">' +
        tabsHTML +
      '</div>';
    }

    case 'app-icon': {
      // Single app launcher: PNG icon + small label underneath.
      // Used inside Home's app-grid (expanded from `app-grid` role).
      var av = (comp && comp.variant) || {};
      var app = av.app || 'App';
      var pngMap = {
        'Phone':'Phone.png','Messages':'Messages.png','Internet':'Internet.png',
        'Camera':'Camera.png','Gallery':'Gallery.png','Contacts':'Contacts.png',
        'Settings':'Settings.png','Clock':'Clock.png','Weather':'Weather.png',
        'Calculator':'Calculator.png','Calendar':'Clock.png','Notes':'Notes.png',
        'Cloud':'Cloud.png','Health':'Health.png','Reminder':'Reminder.png',
        'Store':'Store.png','SmartThings':'SmartThings.png','Bixby':'Bixby.png',
        'MyFiles':'MyFiles.png','Studio':'Studio.png','Wallet':'Wallet.png',
        'Wearable':'Wearable.png','Pass':'Pass.png','Find':'Find.png',
        'Radio':'Radio.png','VoiceRecorder':'VoiceRecorder.png',
        'DailyBoard':'DailyBoard.png','DeviceCare':'DeviceCare.png',
        'DigitalWellbeing':'DigitalWellbeing.png','SecureFolder':'SecureFolder.png',
        'SecureWifi':'SecureWifi.png'
      };
      var file = pngMap[app];
      // Size icon to the cell width (leave room for label line)
      var iconSize = rect ? Math.min(rect.w - 8, (rect.h || 0) - 28, 72) : 60;
      if (iconSize < 32) iconSize = 32;
      var iconRadius = Math.round(iconSize * 0.28);

      var iconHTML;
      if (file) {
        iconHTML = '<img src="app-icons/' + file + '" style="width:' + iconSize + 'px;height:' + iconSize + 'px;border-radius:' + iconRadius + 'px;object-fit:cover;flex-shrink:0;">';
      } else {
        iconHTML = '<div style="width:' + iconSize + 'px;height:' + iconSize + 'px;border-radius:' + iconRadius + 'px;background:var(--accent-primary,#4285F4);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;line-height:1;' +
          _T('heading', { weight: 'bold', color: '#fff' }) + '">' + app.charAt(0).toUpperCase() + '</div>';
      }

      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">' +
        iconHTML +
        '<div style="font-size:var(--font-size-sm,16px);font-weight:500;color:#fff;line-height:1.35;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px 1px;text-shadow:0 1px 2px rgba(0,0,0,0.45);">' + app + '</div>' +
      '</div>';
    }

    // ─── OneUI 8.5 atomics — extracted from Figma One UI Design Kit ───────
    // Shared primitives intentionally kept small so Media / QS / Notif
    // variants can be composed from them.

    case 'toggle-chip': {
      // Multi-toggle ROW path — emitted by the `quick_toggle_row`
      // adapter. Lays out N circular toggles side-by-side with a tiny
      // label under each. Used for Samsung QS-style strips on lock or
      // home surface.
      var tcvRow = (comp && comp.variant) || {};
      if (Array.isArray(tcvRow.toggles) && tcvRow.toggles.length) {
        if (A && typeof A.QSToggleStrip === 'function') {
          return A.QSToggleStrip({ toggles: tcvRow.toggles });
        }
        var TOGGLE_ROW_ICONS = {
          'wifi':       '<path d="M2 9c5-4 15-4 20 0M5 13c3.5-3 11-3 14 0M9 17c1.7-1.3 4.3-1.3 6 0M12 21h0.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>',
          'bluetooth':  '<path d="M7 17l10-10-5-5v20l5-5-10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>',
          'flashlight': '<path d="M9 3h6v3l-1 3H10L9 6V3zM10 9h4v12h-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>',
          'airplane':   '<path d="M3 13l8-2V5a1 1 0 0 1 2 0v6l8 2v2l-8-1v4l2 1v2l-3-1-3 1v-2l2-1v-4l-8 1v-2z" fill="currentColor"/>',
          'hotspot':    '<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 16a6 6 0 0 1 0-8M16 16a6 6 0 0 0 0-8M5 19a10 10 0 0 1 0-14M19 19a10 10 0 0 0 0-14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>',
          'location':   '<path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>',
          'auto-rotate':'<path d="M4 12a8 8 0 0 1 14-5l2-2M20 7v4h-4M20 12a8 8 0 0 1-14 5l-2 2M4 17v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>',
          'sound':      '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/><path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>',
          'vibrate':    '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/><path d="M18 8c1.5 1 2 2.5 2 4s-0.5 3-2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>',
          'mute':       '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>',
          'power-save': '<rect x="5" y="7" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="19" y="10" width="2" height="4" fill="currentColor"/><path d="M11 10l-2 4h3l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>',
          'camera':     '<rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><circle cx="12" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M9 7l1.5-2h3L15 7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>',
          'screen-share':'<rect x="3" y="5" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>'
        };
        var tiles = tcvRow.toggles.map(function (t) {
          var iconPath = TOGGLE_ROW_ICONS[t.icon] || TOGGLE_ROW_ICONS['sound'];
          var bg    = t.on
            ? 'var(--qs-row-toggle-on-bg, rgba(246,248,248,0.88))'
            : 'var(--qs-row-toggle-off-bg, rgba(56,77,82,0.42))';
          var color = t.on
            ? 'var(--qs-row-toggle-on-fg, rgba(30,42,46,0.82))'
            : 'var(--qs-row-toggle-off-fg, rgba(214,226,226,0.52))';
          var shadow = t.on
            ? 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),0 8px 18px rgba(0,0,0,0.18);'
            : 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);';
          return '<div style="display:flex;align-items:center;justify-content:center;flex:1;min-width:0;cursor:pointer;" data-toggle-chip="1" data-on="' + (t.on ? '1' : '0') + '" title="' + t.name + '">' +
            '<div style="width:52px;height:52px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;color:' + color + ';transition:background 0.15s;' + shadow + '">' +
              '<svg width="23" height="23" viewBox="0 0 24 24">' + iconPath + '</svg>' +
            '</div>' +
          '</div>';
        }).join('');
        return '<div style="width:100%;min-height:92px;height:100%;display:flex;align-items:center;justify-content:space-around;gap:12px;padding:18px 20px;box-sizing:border-box;border-radius:var(--card-radius,' + _R('widget') + ');' +
          _G('panel') +
          'overflow:hidden;position:relative;">' +
          '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.10),transparent 58%,rgba(0,0,0,0.08));pointer-events:none;opacity:var(--qs-row-sheen-opacity, 1);"></div>' +
          '<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-around;gap:12px;width:100%;">' +
          tiles +
          '</div>' +
          '<div style="position:absolute;left:50%;bottom:7px;transform:translateX(-50%);width:40px;height:4px;border-radius:4px;background:rgba(240,244,244,0.72);"></div>' +
        '</div>';
      }
      // 56×56 circular toggle — primitive. Matches Figma `ToggleIcon`
      // 544:1125 exactly: bg rgba(180,180,180,0.2) / p-13 / rounded-full.
      // `data-toggle-chip` marks it for the delegated interact-mode click
      // handler (see _bindInteractiveAtomics at bottom of file).
      //
      // variant.label → Samsung QS "label below circle" composition. NOT a
      //                 Figma-defined atomic — it's composed by Samsung from
      //                 Single/Toggle (88×88) + external label text. Use
      //                 `single-toggle` role (role = 'single-toggle') for
      //                 Figma-exact 88×88 wrapper or 199×88 side-label.
      // variant.icon  → named glyph for the circle center.
      var tcv = (comp && comp.variant) || {};
      var on = tcv.on === true || tcv.state === 'on';
      var label = tcv.label || '';
      var iconKey = tcv.icon || '';

      // Small icon library for QS labeled toggles. Keys mirror the Samsung
      // QS names (auto-rotate / airplane / flashlight / …). Unknown keys
      // fall back to a neutral + / ✓ pair.
      var ICONS = {
        'sound':       '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        'vibrate':     '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M18 8c1.5 1 2 2.5 2 4s-0.5 3-2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>',
        'mute':        '<path d="M5 9v6h4l5 4V5L9 9H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>',
        // Figma 340:6297 — classic bluetooth B: diagonals + vertical spine.
        // Path: low-left → diag up-right → top-peak → vertical spine down →
        // low-right-peak → diag up-left back. Renders the recognizable
        // Samsung bluetooth glyph at 24×24.
        'bluetooth':   '<path d="M7 17l10-10-5-5v20l5-5-10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>',
        'screen-share':'<rect x="3" y="5" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>',
        'camera':      '<rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M9 7l1.5-2h3L15 7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>',
        'auto-rotate': '<path d="M4 12a8 8 0 0 1 14-5l2-2M20 7v4h-4M20 12a8 8 0 0 1-14 5l-2 2M4 17v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>',
        'airplane':    '<path d="M3 13l8-2V5a1 1 0 0 1 2 0v6l8 2v2l-8-1v4l2 1v2l-3-1-3 1v-2l2-1v-4l-8 1v-2z" fill="currentColor"/>',
        'flashlight':  '<path d="M9 3h6v3l-1 3H10L9 6V3zM10 9h4v12h-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>',
        'hotspot':     '<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 16a6 6 0 0 1 0-8M16 16a6 6 0 0 0 0-8M5 19a10 10 0 0 1 0-14M19 19a10 10 0 0 0 0-14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>',
        'power-save':  '<rect x="5" y="7" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="19" y="10" width="2" height="4" fill="currentColor"/><path d="M11 10l-2 4h3l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
        'location':    '<path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6"/>',
        'link':        '<path d="M10 14l-3 3a3 3 0 0 1-4-4l3-3M14 10l3-3a3 3 0 0 1 4 4l-3 3M8 16l8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>',
        'quick-share': '<circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.6"/>',
        'dex':         '<rect x="3" y="5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8 20h8M12 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><text x="12" y="12.5" font-size="6" fill="currentColor" text-anchor="middle" font-family="Arial" font-weight="700">DeX</text>',
        'eye-comfort': '<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M16 8a6 6 0 1 1-4 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="10" cy="10" r="1" fill="currentColor"/>',
        'dnd':         '<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        'qr':          '<rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.6"/><rect x="4" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.6"/><path d="M14 14h3v3M20 14v6M14 20h6" stroke="currentColor" strokeWidth="1.6"/>',
        'interpreter': '<path d="M5 9h6M8 6v3M7 12l2 5 2-5M14 14l2 5 2-5M13 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>',
        'multi':       '<path d="M6 12l4-4 4 4-4 4-4-4zM14 6h6v6M20 18h-6v-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>',
        'secure':      '<rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>',
        'broadcast':   '<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>',
        // Figma "wifi 3" (3018:6371 / 6381) — 4 vectors: 3 nested arcs
        // (outer/middle/inner) bowing UP + 1 dot at the bottom center.
        // Cubic bezier used (instead of elliptical arc) for a smoother
        // Samsung curve at small sizes.
        'wifi':        '<path d="M5 10.5c3.9-3 10.1-3 14 0M7.5 13.5c2.6-2 6.4-2 9 0M10 16.5c1.3-1 2.7-1 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
        // Figma 989:22477 / 3018:6357 "mobile data qs" — two vertical arrows
        // side-by-side: left ↓ (download), right ↑ (upload). Aspect ≈ 71:61.
        'mobile-data': '<path d="M8.5 4v16M4.5 15l4 5 4-5M15.5 20V4M11.5 9l4-5 4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>',
        // Figma 474:600 — battery "fully charged" pill with 100% fill.
        // Rounded rectangle body + small positive terminal nub on the right.
        'battery':     '<rect x="3" y="8" width="17" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="20.5" y="11" width="1.5" height="4" rx="0.5" fill="currentColor"/><rect x="5" y="10" width="13" height="6" rx="1" fill="currentColor"/>',
        'modes':       '<circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M12 4v8l6 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        // Figma brightness (I1109:10261;…;340:6324 + 6325) — sun disc + rays
        'brightness':  '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        // Figma 1109:10246;…;530:6 — music eighth note with beam
        'music':       '<path d="M9 18V5l11-2v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="7" cy="18" r="2.5" fill="currentColor"/><circle cx="18" cy="14" r="2.5" fill="currentColor"/>',
        // Figma 340:6583 — dark mode moon (crescent)
        'moon':        '<path d="M19 14A8 8 0 1 1 10 5a6 6 0 0 0 9 9z" fill="currentColor"/>',
        // Figma 340:7776 — sound vibrate (muted speaker with diagonal line)
        'mute':        '<path d="M4 10v4h3l4 3.5V6.5L7 10H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        // Phone handset — used by lock-screen bottom-left shortcut
        'phone':       '<path d="M5 4.5C5 3.67 5.67 3 6.5 3h2.28c0.69 0 1.28 0.47 1.44 1.14l0.59 2.35c0.11 0.43-0.02 0.88-0.33 1.19l-1.27 1.27a11.5 11.5 0 0 0 5.34 5.34l1.27-1.27c0.31-0.31 0.76-0.44 1.19-0.33l2.35 0.59c0.67 0.16 1.14 0.75 1.14 1.44V17.5c0 0.83-0.67 1.5-1.5 1.5C9.94 19 5 14.06 5 8.5V4.5z" fill="currentColor"/>'
      };
      var iconPath = ICONS[iconKey] || ICONS['modes'];
      var size = label ? 22 : 24;
      var iconColorOn = 'var(--qs-chip-icon-on, #222)';
      var iconColorOff = 'var(--qs-chip-icon-off, #fff)';
      var plusSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="' + iconColorOff + '" strokeWidth="1.8" strokeLinecap="round"/></svg>';
      var iconSvg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" style="color:' + (on ? iconColorOn : iconColorOff) + ';">' + iconPath + '</svg>';
      var circle = '<div data-toggle-chip data-on="' + (on ? '1' : '0') + '" ' +
        'style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
          'background:' + (on ? 'var(--qs-chip-on-bg, #d5d5d5)' : 'var(--qs-chip-off-bg, rgba(180,180,180,0.2))') + ';transition:background 180ms ease;' +
          (label ? 'margin:0 auto 8px;' : 'margin:auto;') + '">' +
          '<span data-toggle-on style="display:' + (on ? 'inline-flex' : 'none') + ';">' + iconSvg + '</span>' +
          '<span data-toggle-off style="display:' + (on ? 'none' : 'inline-flex') + ';">' +
            (iconKey ? iconSvg.replace('color:' + iconColorOn, 'color:' + iconColorOff) : plusSvg) +
          '</span>' +
        '</div>';
      if (!label) return circle;
      // Labeled variant — ANCHOR the circle to the top (NOT justify-center)
      // so rows of chips stay perfectly aligned regardless of whether the
      // label wraps to 1 or 2 lines. Circle at padding-top:4; label at
      // fixed margin-top so it hangs below at a consistent offset.
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;' +
        'padding-top:4px;box-sizing:border-box;color:var(--text-primary,#fff);font-family:var(--font);overflow:visible;">' +
        circle +
        '<div style="' + _T('label', { weight: 'medium', color: 'secondary' }) + 'text-align:center;line-height:1.25;max-width:86px;' +
          'margin-top:8px;white-space:normal;word-break:keep-all;color:var(--text-secondary,rgba(255,255,255,0.92));">' + label + '</div>' +
      '</div>';
    }

    case 'toggle-grid': {
      // Figma "Icons" shell — node 544:865 / 1109:10370. Glass pill with
      // N rows of 56×56 toggle-chips, evenly distributed via flex
      // justify-between. Spec matches 1:1:
      //   bg rgba(23,23,26,0.6) + 1px border rgba(255,255,255,0.2)
      //   rounded 50 · padding 24 25 · column flex gap 20
      //   per row: flex justify-between, 4 toggle-chips
      //   drag handle 50×4 bar near the bottom edge
      //
      // variant.cells → array of { icon, label, on } — when a cell has a
      //                 `label` we render the labeled toggle-chip (icon +
      //                 text below). No label = icon-only 56 circle.
      // variant.cols / rows → grid shape (default 4×2 = 8 cells).
      var tgv = (comp && comp.variant) || {};
      var cells = Array.isArray(tgv.cells) ? tgv.cells : null;
      var cols = tgv.cols || 4;
      var rows = tgv.rows || 2;

      function _tgCell(cellVariant) {
        return window.renderAtomicForRole(
          { role: 'toggle-chip', variant: cellVariant || {} },
          { w: 88, h: 88 }
        );
      }

      var rowsHtml = '';
      for (var r = 0; r < rows; r++) {
        var rowInner = '';
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var cellVariant;
          if (cells && cells[idx]) {
            cellVariant = {
              icon:  cells[idx].icon  || 'modes',
              label: cells[idx].label || '',
              on:    cells[idx].on === true
            };
          } else {
            cellVariant = { on: false };
          }
          rowInner += '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">' +
            _tgCell(cellVariant) +
          '</div>';
        }
        rowsHtml += '<div style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;flex-shrink:0;">' +
          rowInner +
        '</div>';
      }

      return '<div style="width:100%;height:100%;' +
        _G('panel') +
        'border:var(--surface-border, 1px solid rgba(255,255,255,0.2));border-radius:var(--card-radius,' + _R('widget') + ');' +
        'padding:24px 25px;box-sizing:border-box;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;' +
        'position:relative;overflow:hidden;">' +
        rowsHtml +
        // Figma drag handle (987:16943 + 544:2861): 11px holder at bottom:-1px
        // with a 50×4 bar riding at top of holder → visually sits just above
        // the bottom edge, bumping slightly past the rounded corner.
        '<div style="position:absolute;left:50%;bottom:-1px;transform:translateX(-50%);width:50px;height:11px;pointer-events:none;">' +
          '<div style="position:absolute;top:0;left:0;width:50px;height:4px;border-radius:2px;background:rgba(255,255,255,0.6);"></div>' +
        '</div>' +
      '</div>';
    }

    case 'slider-pill': {
      // Pill slider with gradient fill. Horizontal by default; set
      // `variant.orient = 'vertical'` for the tall brightness-style slider.
      // `variant.icon` selects the handle glyph:
      //   'volume' (default), 'sun' (brightness), 'moon' (night).
      var spv = (comp && comp.variant) || {};
      var pct = spv.percent != null ? spv.percent : 32;
      var orient = spv.orient || 'horizontal';
      var iconKey = spv.icon || 'volume';
      var ICON_SVGS = {
        'volume':    '<path d="M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>',
        'sun':       '<circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        'moon':      '<path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>',
        // Figma brightness (I1109:10261;…;340:6324 + 6325): sun disc + rays
        'brightness':'<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>',
        // Figma music (I1109:10246;…;530:6): eighth note with beam
        'music':     '<path d="M9 18V5l11-2v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="7" cy="18" r="2.5" fill="currentColor"/><circle cx="18" cy="14" r="2.5" fill="currentColor"/>'
      };
      var iconSvg = ICON_SVGS[iconKey] || ICON_SVGS['volume'];

      if (orient === 'vertical') {
        // Tall vertical slider — fill grows from the BOTTOM up. Handle icon
        // sits at the bottom center of the pill (representing the control
        // handle / indicator glyph below the track).
        return '<div data-slider-pill data-pct="' + pct + '" data-orient="vertical" ' +
          'style="width:100%;height:100%;min-width:56px;background:rgba(185,185,185,0.2);border-radius:28px;position:relative;touch-action:none;overflow:hidden;">' +
          '<div data-slider-fill style="position:absolute;left:0;right:0;bottom:0;height:' + pct + '%;min-height:56px;background:linear-gradient(to top,#c6c4c3,#e4e4e4);border-radius:28px;transition:height 60ms linear;"></div>' +
          '<div style="position:absolute;bottom:13px;left:50%;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#222;pointer-events:none;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' + iconSvg + '</svg>' +
          '</div>' +
        '</div>';
      }
      return '<div data-slider-pill data-pct="' + pct + '" ' +
        'style="width:100%;height:56px;background:rgba(185,185,185,0.2);border-radius:28px;position:relative;touch-action:none;">' +
        '<div data-slider-fill style="position:absolute;left:0;top:0;bottom:0;width:' + pct + '%;min-width:74px;background:linear-gradient(to right,#c6c4c3,#e4e4e4);border-radius:28px;transition:width 60ms linear;"></div>' +
        '<div style="position:absolute;left:13px;top:13px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#222;pointer-events:none;">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' + iconSvg + '</svg>' +
        '</div>' +
      '</div>';
    }

    case 'drag-handle': {
      // 50×4 rounded bar — bottom-of-sheet / QS expand indicator.
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><div style="width:50px;height:4px;border-radius:2px;background:rgba(255,255,255,0.6);"></div></div>';
    }

    case 'now-bar': {
      // Figma Now Bar — 248×64 pill with 3 type variants (3 distinct Figma
      // components sharing the same container spec):
      //   media    (752:7978) → teal bg rgba(3,78,110,0.8), 40 image + song
      //                          title (14 semibold) + prev/pause/next controls
      //   timer    (752:7988) → glass rgba(23,23,26,0.6) + 0.25 border, 40
      //                          icon (#5b53c8 optional bg) + 26 semibold time
      //                          + pause icon on right
      //   charging (752:7994) → glass + green Union gradient fill (left), bolt
      //                          icon + 26 semibold percent (no right icon)
      // All: backdrop-blur 12px, padding 12 top/bottom, pl 12 pr 18, radius 53.
      var nbv = (comp && comp.variant) || {};
      var nbType = nbv.type || 'timer';
      var common = 'min-height:64px;height:64px;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
        'padding:12px 18px 12px 12px;box-sizing:border-box;display:flex;align-items:center;gap:14px;' +
        'border-radius:53px;color:var(--text-primary,#fff);font-family:var(--font);overflow:hidden;position:relative;max-width:100%;min-width:0;';

      if (nbType === 'media') {
        // Song title scrolls as a marquee. Earlier revisions used a
        // hardcoded "Never Gonna Give You Up · Rick Astley (1987)"
        // default that leaked into production screens when the AI
        // didn't supply a marquee (the "Astley (1987)" tail visible
        // on every music lockscreen generation). Now: if marquee isn't
        // set, build it from the actual content (title · artist · album),
        // falling back to just the title. Only use "Now playing" as a
        // last-ditch placeholder when literally nothing is emitted —
        // better than a wrong song name.
        var mSong    = nbv.title || nbv.song || 'Now playing';
        var mMarquee = nbv.marquee
          || [nbv.title || nbv.song, nbv.artist, nbv.album].filter(Boolean).join(' \u00B7 ')
          || mSong;
        var mImgBg   = nbv.imgBg || '#5b53c8';
        return '<div style="width:100%;max-width:100%;min-width:0;box-sizing:border-box;' + common + _G('widgetPill') + 'padding:5px 12px;gap:8px;color:var(--text-primary,#fff);">' +
          '<div style="width:40px;height:40px;border-radius:37px;background:' + mImgBg + ';flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-primary,#fff);">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>' +
          '</div>' +
          '<div style="flex:1;min-width:0;max-width:100%;display:flex;flex-direction:column;align-items:stretch;gap:10px;">' +
            // Marquee — fluid width inside the pill (was fixed 164px → overflow in narrow cards).
            '<div style="width:100%;max-width:100%;min-width:0;height:22px;overflow:hidden;position:relative;mask-image:linear-gradient(to right,transparent 0,#000 8px,#000 calc(100% - 8px),transparent 100%);">' +
              '<div class="nowbar-marquee-track" style="position:absolute;top:0;left:0;white-space:nowrap;font-size:14px;font-weight:700;line-height:1.3;color:var(--text-primary,#fff);animation:nowbar-marquee 14s linear infinite;">' +
                '<span style="padding-right:32px;">' + mMarquee + '</span>' +
                '<span style="padding-right:32px;">' + mMarquee + '</span>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-primary,#fff);flex-shrink:0;">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 5L8 12l10 7V5z" fill="currentColor"/><rect x="5" y="5" width="2" height="14" fill="currentColor"/></svg>' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="7" y="5" width="3.5" height="14" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" fill="currentColor"/></svg>' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 5l10 7-10 7V5z" fill="currentColor"/><rect x="17" y="5" width="2" height="14" fill="currentColor"/></svg>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      // Navigation turn-by-turn — arrow icon (direction-aware) + big
      // distance + instruction text. Teal/blue accent for navigation
      // context. Mimics Samsung Maps live navigation now-bar.
      if (nbType === 'navigation') {
        var navDist  = nbv.distance    || '';
        var navInstr = nbv.instruction || 'Continue';
        var navEta   = nbv.eta         || '';
        var dir      = nbv.direction   || 'straight';
        // Direction-aware arrow glyphs
        var ARROW = {
          left:    '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
          right:   '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M19 12l-7-7M19 12l-7 7" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
          straight:'<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
          uturn:   '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M5 17V11a5 5 0 0 1 10 0v6M5 17l-2-3M5 17l3-3" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
          exit:    '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M9 5l-4 7 4 7M5 12h12M14 7l4 5-4 5" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>',
          merge:   '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M12 19V8M12 8l-4 4M12 8l4 4M5 19l4-4M19 19l-4-4" stroke="var(--card-nav-accent,#14B8A6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>'
        };
        var arrow = ARROW[dir] || ARROW.straight;
        var nbSkin = _themeSurfaceStyleRoot();
        var navPillShell = nbSkin === 'neon'
          ? 'background:#ffffff;border:var(--surface-border);box-shadow:var(--surface-shadow);-webkit-backdrop-filter:none;backdrop-filter:none;'
          : _G('widgetPill');
        // Do not reuse `common`: fixed 64px height + overflow clipped long turn
        // instructions mid-glyph. Auto height + 2-line ellipsis; distance ellipsizes when cramped.
        var navOuter = 'min-height:64px;height:auto;' +
          '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
          'padding:12px 18px 12px 12px;box-sizing:border-box;display:flex;align-items:center;gap:10px;' +
          'border-radius:53px;color:var(--text-primary,#fff);font-family:var(--font);overflow:hidden;' +
          'position:relative;width:100%;max-width:100%;';
        function _navEscAttr(txt) {
          return String(txt || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/\r|\n/g, ' ');
        }
        return '<div style="' + navOuter + navPillShell + 'padding:12px 24px 12px 16px;">' +
          '<div style="width:40px;height:40px;flex-shrink:0;align-self:center;border-radius:20px;background:var(--card-nav-arrow-bg,rgba(20,184,166,0.25));display:flex;align-items:center;justify-content:center;padding:8px;">' +
            arrow +
          '</div>' +
          '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:9px;">' +
            (navDist
              ? '<div title="' + _navEscAttr(navDist) + '" style="font-size:20px;font-weight:500;line-height:1.3;color:#ffffff;letter-spacing:-0.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + navDist + '</div>'
              : '') +
            '<div title="' + _navEscAttr(navInstr) + '" style="font-family:var(--font);font-size:16px;font-weight:500;color:#8DE7E7;' +
              'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;' +
              'word-break:break-word;line-height:1.3;text-overflow:ellipsis;">' + navInstr + '</div>' +
          '</div>' +
          (navEta
            ? '<div title="' + _navEscAttr(navEta) + '" style="font-family:var(--font);font-size:18px;font-weight:700;color:#E3DBC8;flex-shrink:0;flex-basis:auto;white-space:nowrap;align-self:center;padding-left:8px;border-left:1px solid color-mix(in srgb, var(--text-primary,#fff) 18%, transparent);line-height:1.3;">' + navEta + '</div>'
            : '') +
        '</div>';
      }

      // Dual-line — notification-style now-bar with a 40px app icon,
      // two stacked text lines, and an optional trailing status glyph.
      if (nbType === 'dual-line' || nbType === 'delivery') {
        var dlTitle    = nbv.title    || nbv.label   || '8min away';
        var dlSubtitle = nbv.subtitle || nbv.sub     || nbv.value || 'Arrives 9:45 - 9:50';
        var dlApp      = nbv.app      || nbv.service || nbv.iconLabel || 'Uber Eats';
        var dlIconBg   = nbv.iconBg   || '#35D466';
        var dlTrail    = nbv.trailing || nbv.trailingIcon || 'car';
        var dlTrailSvg = dlTrail === 'none' ? '' :
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex:none;opacity:0.78;">' +
            '<path d="M5 17h14M7 17l1.45-5h7.1L17 17M6 17v2M18 17v2" stroke="#848487" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>' +
            '<circle cx="9" cy="15.2" r="0.9" fill="#848487"/>' +
            '<circle cx="15" cy="15.2" r="0.9" fill="#848487"/>' +
          '</svg>';
        return '<div style="margin:0 auto;width:100%;max-width:100%;min-width:0;min-height:64px;height:auto;flex:none;box-sizing:border-box;' +
          'display:flex;flex-direction:row;align-items:center;padding:12px 24px 12px 16px;gap:14px;' +
          'background:var(--surface-bg, rgba(23,23,26,0.80));border:var(--surface-border, 1px solid rgba(255,255,255,0.12));' +
          '-webkit-backdrop-filter:var(--surface-filter, blur(12px));backdrop-filter:var(--surface-filter, blur(12px));border-radius:53px;' +
          'color:var(--text-primary,#fff);font-family:var(--font);overflow:hidden;">' +
          '<div style="width:40px;height:40px;border-radius:20px;background:' + dlIconBg + ';flex:none;display:flex;align-items:center;justify-content:center;color:#000;overflow:hidden;">' +
            '<div style="font-weight:700;font-size:16px;line-height:1.15;letter-spacing:-0.7px;text-align:left;white-space:normal;">' + dlApp.replace(/\s+/, '<br>') + '</div>' +
          '</div>' +
          '<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:9px;">' +
            '<div style="font-size:20px;font-weight:500;line-height:1.3;color:#ffffff;letter-spacing:-0.45px;white-space:nowrap;overflow:hidden;text-overflow:clip;">' + dlTitle + '</div>' +
            '<div style="font-size:16px;font-weight:500;line-height:1.3;color:#8DE7E7;letter-spacing:-0.25px;white-space:nowrap;overflow:hidden;text-overflow:clip;">' + dlSubtitle + '</div>' +
          '</div>' +
          dlTrailSvg +
        '</div>';
      }

      // Voice input — One UI voice/search pill.
      if (nbType === 'single-line') {
        var voicePrompt = nbv.prompt || nbv.placeholder || 'What are you looking for?';
        var voiceSurface = _themeSurfaceStyleRoot();
        var voiceIsFlat = voiceSurface === 'flat';
        var voiceIsNeon = voiceSurface === 'neon';
        var voiceIsGlass = voiceSurface === 'glass';
        var voiceBg = voiceIsNeon
          ? '#ffffff'
          : (voiceIsFlat
          ? 'var(--surface-bg, rgba(23,23,26,0.80))'
          : (voiceIsGlass
            ? 'radial-gradient(circle at 14% 0%,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.045) 30%,transparent 58%), linear-gradient(90deg,rgba(102,161,243,0.28) 0%,rgba(34,201,166,0.18) 58%,rgba(255,255,255,0.04) 100%), rgba(23,23,26,0.18)'
            : 'linear-gradient(90deg,#364B6F 0%,#384247 64.81%,#2D2D30 87.17%)'));
        var voiceNeonGreen = 'var(--surface-bg,#b8ff42)';
        var voiceTextStyle = voiceIsNeon
          ? 'color:' + voiceNeonGreen + ';'
          : (voiceIsFlat
            ? 'color:var(--accent-primary,#0381FE);'
            : 'background:linear-gradient(90deg,#78AFFF 0%,#31D8B3 100%);-webkit-background-clip:text;background-clip:text;color:transparent;');
        var voiceIconColor = voiceIsNeon
          ? voiceNeonGreen
          : (voiceIsFlat ? 'var(--accent-primary,#0381FE)' : '#31D8B3');
        var voiceChrome = voiceIsGlass
          ? 'border:1px solid rgba(255,255,255,0.16);-webkit-backdrop-filter:blur(42px) saturate(1.45) brightness(1.02);backdrop-filter:blur(42px) saturate(1.45) brightness(1.02);box-shadow:inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(255,255,255,0.035), 0 18px 42px rgba(0,0,0,0.24);'
          : (voiceIsNeon
            ? 'border:var(--surface-border, 1px solid rgba(255,255,255,0.12));-webkit-backdrop-filter:var(--surface-filter, blur(12px));backdrop-filter:var(--surface-filter, blur(12px));box-shadow:var(--surface-shadow, none);'
            : 'box-shadow:-1px 0px 4px 1px rgba(78,102,139,0.58);');
        return '<div style="margin:0 auto;width:100%;max-width:100%;min-width:0;height:58px;display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:17px 20px;gap:12px;box-sizing:border-box;background:' + voiceBg + ';' + voiceChrome + 'border-radius:30px;color:var(--text-primary,#fff);font-family:var(--font);overflow:hidden;flex:1 1 auto;">' +
          '<div style="font-size:17px;font-weight:700;line-height:1.05;letter-spacing:-0.55px;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + voiceTextStyle + '">' + voicePrompt + '</div>' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex:none;color:' + voiceIconColor + ';">' +
            '<rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>' +
            '<path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>' +
          '</svg>' +
        '</div>';
      }

      if (nbType === 'charging') {
        var percent = nbv.percent != null ? nbv.percent : 69;
        var chargeSurface = _themeSurfaceStyleRoot();
        var chargeIsFlat = chargeSurface === 'flat';
        var chargeIsNeon = chargeSurface === 'neon';
        var chargeIsGlass = chargeSurface === 'glass';
        // Neon: white track (unfilled / right), neon-green fill grows from the
        // left by percent — avoids the legacy two-layer gradient trick.
        if (chargeIsNeon) {
          var neonTrack = 'var(--nowbar-charging-track-bg, #ffffff)';
          var neonFill = 'var(--nowbar-charging-fill-bg, var(--surface-bg))';
          var neonBolt = 'var(--nowbar-charging-bolt-fill, var(--text-primary,#050805))';
          var neonPct = 'var(--nowbar-charging-percent-color, var(--text-primary,#050805))';
          var pctW = Math.max(0, Math.min(100, Number(percent)));
          if (isNaN(pctW)) pctW = 69;
          return '<div style="margin:0 auto;width:100%;max-width:100%;min-width:0;height:64px;' +
            'display:flex;flex-direction:row;align-items:center;padding:12px 18px 12px 12px;gap:14px;' +
            'isolation:isolate;position:relative;overflow:hidden;box-sizing:border-box;' +
            'background:' + neonTrack + ';' +
            'border:var(--surface-border, 1px solid rgba(5,8,5,0.14));' +
            'box-shadow:var(--surface-shadow, none);' +
            '-webkit-backdrop-filter:none;backdrop-filter:none;' +
            'border-radius:53px;font-family:var(--font);">' +
            '<div style="position:absolute;left:0;top:0;bottom:0;width:' + pctW + '%;max-width:100%;background:' + neonFill + ';z-index:0;pointer-events:none;"></div>' +
            '<div style="width:40px;height:40px;position:relative;z-index:1;flex:none;">' +
              '<div style="position:absolute;width:40px;height:40px;left:0;top:0;background:#5B53C8;opacity:0;border-radius:20px;"></div>' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="position:absolute;left:8px;top:8px;">' +
                '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="' + neonBolt + '"/>' +
              '</svg>' +
            '</div>' +
            '<div style="position:relative;z-index:2;flex:1 1 auto;min-width:0;height:23px;display:flex;align-items:center;justify-content:center;">' +
              '<div style="font-size:26px;font-weight:700;line-height:18px;color:' + neonPct + ';letter-spacing:-0.2px;font-feature-settings:\'pnum\' on, \'lnum\' on;">' + percent + '%</div>' +
            '</div>' +
            '<div style="width:24px;height:24px;opacity:0;position:relative;z-index:3;flex:none;"></div>' +
          '</div>';
        }
        var chargeFill = chargeIsFlat
          ? 'var(--accent-primary,#0381FE)'
          : (_isMonoChromaRoot()
            ? 'linear-gradient(90deg,#d5d5d5 0%,#aaaaae 35.93%,#78787d 100%)'
            : 'linear-gradient(90deg,#98DFA9 0%,#3BD18B 35.93%,#2E979F 100%)');
        var chargeSubtract = chargeIsFlat
          ? 'var(--accent-primary,#0381FE)'
          : (_isMonoChromaRoot()
            ? 'linear-gradient(90deg,#d8d8dc 0%,#a8a8ad 28.87%,#77777c 100%)'
            : 'linear-gradient(90deg,#9BDCA9 0%,#31CE8A 28.87%,#2F989F 100%)');
        var chargeMotionStyle = chargeIsFlat ? '' : 'background-size:180% 100%;animation:oneuiSurfaceShift 3.8s ease-in-out infinite alternate;';
        var chargeShimmer = chargeIsFlat ? '' : '<div style="position:absolute;width:157px;height:76px;left:-0.5px;bottom:0;background:linear-gradient(110deg,transparent 0%,transparent 34%,rgba(255,255,255,0.28) 50%,transparent 66%,transparent 100%);background-size:260% 100%;animation:aiShimmer 2.8s linear infinite;mix-blend-mode:screen;opacity:0.7;z-index:1;pointer-events:none;"></div>';
        var chargeShell = chargeIsGlass
          ? _G('panel')
          : 'background:var(--surface-bg, rgba(23,23,26,0.80));-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);';
        return '<div style="margin:0 auto;width:100%;max-width:100%;min-width:0;height:64px;' +
          'display:flex;flex-direction:row;align-items:center;padding:12px 18px 12px 12px;gap:14px;' +
          'isolation:isolate;position:relative;overflow:hidden;box-sizing:border-box;' +
          chargeShell +
          'border-radius:53px;color:var(--text-primary,#fff);font-family:var(--font);">' +
          '<div style="position:absolute;width:157px;height:76px;left:-0.5px;bottom:0;background:' + chargeFill + ';' + chargeMotionStyle + 'z-index:0;"></div>' +
          '<div style="position:absolute;width:154px;height:64px;left:-0.5px;top:0;background:' + chargeSubtract + ';' + chargeMotionStyle + 'z-index:0;"></div>' +
          chargeShimmer +
          '<div style="width:40px;height:40px;position:relative;z-index:1;flex:none;">' +
            '<div style="position:absolute;width:40px;height:40px;left:0;top:0;background:#5B53C8;opacity:0;border-radius:20px;"></div>' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="position:absolute;left:8px;top:8px;">' +
              '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#848487"/>' +
            '</svg>' +
          '</div>' +
          '<div style="position:relative;z-index:2;flex:1 1 auto;min-width:0;height:23px;display:flex;align-items:center;justify-content:center;">' +
            '<div style="font-size:26px;font-weight:700;line-height:18px;color:var(--text-primary,#fff);letter-spacing:-0.2px;font-feature-settings:\'pnum\' on, \'lnum\' on;">' + percent + '%</div>' +
          '</div>' +
          '<div style="width:24px;height:24px;opacity:0;position:relative;z-index:3;flex:none;"></div>' +
        '</div>';
      }

      // timer (default) — icon + 26px time + pause
      // When variant.live === true, adds data-live-timer so a global ticker
      // (see scenes.js _startLiveTimerTicker) increments the displayed time
      // every second. The `data-start` attribute records when the timer
      // began so we can compute elapsed seconds on each tick (survives
      // rerenders by using the wall-clock delta, not an accumulator).
      var tLabel = nbv.label || nbv.time || '00:00:00';
      var tIcon  = nbv.icon  || 'stopwatch';
      var showPause = nbv.showPause !== false;
      var iconBg = nbv.iconBg !== false;
      var isLive = nbv.live === true;
      var TIMER_ICONS = {
        'stopwatch':'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M12 11v3l2 1.5M10 3h4M14 5l1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>',
        'timer':    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>'
      };
      var timerSvg = TIMER_ICONS[tIcon] || TIMER_ICONS['stopwatch'];
      var liveAttrs = isLive ? ' data-live-timer="1" data-start="' + Date.now() + '"' : '';
      return '<div style="width:100%;' + common + _G('widgetPill') + '">' +
        '<div style="width:40px;height:40px;border-radius:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-primary,#fff);' +
          (iconBg ? 'background:#5b53c8;' : '') + '">' + timerSvg + '</div>' +
        '<div style="flex:1;min-width:0;"><div' + liveAttrs + ' style="font-size:26px;font-weight:700;line-height:18px;color:var(--text-primary,#fff);letter-spacing:-0.2px;white-space:nowrap;font-family:Inter,system-ui,sans-serif;">' + tLabel + '</div></div>' +
        (showPause ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:var(--text-primary,#fff);"><rect x="7" y="5" width="3.5" height="14" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" fill="currentColor"/></svg>' : '') +
      '</div>';
    }

    case 'media-half': {
      // Figma "Media (Half | Off)" — node 544:967. Collapsed 199×163 glass
      // card shown when no media is active. Structure:
      //   container 199×163, bg rgba(23,23,26,0.6), border 1px rgba 0.2,
      //              rounded 36, padding 14 29
      //   inner stack (160w) vertically justify-between:
      //     1) Output chip — bg rgba(0,0,0,0.2) rounded 43, px-8 py-5,
      //          media-volume icon 19.7 + "Media Output" text 14/400
      //     2) Song row — play-triangle 19 + "No Media Playing" 15/500
      //     3) Progress line — thin 150.5 horizontal divider
      //     4) Controls — prev/play/next 24px icons, gap 21
      // All-interactive: each control has data-shortcut for press ripple.
      var mhv = (comp && comp.variant) || {};
      var mhTitle = mhv.title || 'No Media Playing';
      var mhOutput = mhv.output || 'Media Output';
      return '<div style="width:100%;height:100%;max-width:100%;min-width:0;' +
        'background:rgba(23,23,26,0.6);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:' + _R('widget') + ';padding:14px 29px;box-sizing:border-box;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'color:#fff;font-family:var(--font);overflow:hidden;">' +
        '<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px;flex:1;">' +
          // 1) Output chip
          '<div data-shortcut="1" style="display:flex;align-items:center;gap:6px;padding:6px 9px;background:rgba(0,0,0,0.2);border-radius:43px;cursor:pointer;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color:#fff;">' +
              '<path d="M4 10v4h3l4 3.5V6.5L7 10H4z" fill="currentColor"/>' +
              '<path d="M14 9.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>' +
            '</svg>' +
            '<span style="font-size:var(--font-size-xs,14px);font-weight:500;color:#fff;white-space:nowrap;">' + mhOutput + '</span>' +
          '</div>' +
          // 2) Song title row (play-triangle + "No Media Playing")
          '<div style="display:flex;align-items:center;gap:6px;justify-content:center;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M8 5l10 7-10 7V5z" fill="#fff"/></svg>' +
            '<span style="font-size:var(--font-size-sm,16px);font-weight:500;letter-spacing:0.3px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + mhTitle + '</span>' +
          '</div>' +
          // 3) Progress line (empty/inactive)
          '<div style="width:100%;height:2px;background:rgba(255,255,255,0.25);border-radius:1px;"></div>' +
          // 4) Controls row — prev / play / next
          '<div style="display:flex;align-items:center;gap:21px;">' +
            '<svg data-shortcut="1" width="22" height="22" viewBox="0 0 24 24" fill="none" style="cursor:pointer;"><path d="M6 5v14M18 5L8 12l10 7V5z" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round"/></svg>' +
            '<svg data-shortcut="1" width="22" height="22" viewBox="0 0 24 24" fill="none" style="cursor:pointer;"><path d="M8 5l10 7-10 7V5z" fill="#fff"/></svg>' +
            '<svg data-shortcut="1" width="22" height="22" viewBox="0 0 24 24" fill="none" style="cursor:pointer;"><path d="M18 5v14M6 5l10 7-10 7V5z" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round"/></svg>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    case 'media-card': {
      // Compact media player — title + single meta line + progress + core transport
      // (prev / pause / next). Omit service/output chrome and shuffle/like so the
      // card stays glanceable on narrow pipeline layouts.
      var mcv = (comp && comp.variant) || {};
      var mTitle = mcv.title  || 'Title';
      var mArtist = mcv.artist != null ? String(mcv.artist).trim() : '';
      var mSub = mArtist
        ? '<div style="font-size:var(--font-size-xs,13px);color:rgba(255,255,255,0.72);letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;">' + mArtist + '</div>'
        : '';
      return '<div style="width:100%;max-width:100%;min-width:0;height:100%;border-radius:' + _R('dialog') + ';padding:12px 16px;box-sizing:border-box;color:#fff;display:flex;flex-direction:column;gap:10px;background:linear-gradient(135deg,#2A1A5E,#1A0A3E 60%,#3A1A6E);overflow:hidden;position:relative;">' +
        '<div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:0 0 auto;">' +
          '<div style="font-size:15px;font-weight:700;letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.25;">' + mTitle + '</div>' +
          mSub +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:0 0 auto;">' +
          '<div style="height:3px;background:rgba(255,255,255,0.22);border-radius:2px;position:relative;">' +
            '<div style="position:absolute;left:0;top:0;bottom:0;width:45%;background:#fff;border-radius:2px;"></div>' +
            '<div style="position:absolute;left:45%;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,0.45);"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.65);letter-spacing:0.15px;">' +
            '<span>02:41</span><span>03:24</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:center;align-items:center;gap:20px;padding:4px 0 0;min-width:0;flex:0 0 auto;">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 5L8 12l10 7V5z" fill="#fff"/><rect x="5" y="5" width="2" height="14" fill="#fff"/></svg>' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" fill="#fff"/><rect x="13.5" y="5" width="3.5" height="14" fill="#fff"/></svg>' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 5l10 7-10 7V5z" fill="#fff"/><rect x="17" y="5" width="2" height="14" fill="#fff"/></svg>' +
        '</div>' +
      '</div>';
    }

    case 'notif-card': {
      // Figma Notification/Regular — node 544:1088. Samsung OneUI 8.5 pill
      // shape with 56×56 app icon + title/time row + subtitle + chevron.
      //
      //   container  → 415×86, rounded 50, padding 15 / 16 / 20, gap 10
      //   icon       → 56×56 circle, app accent bg or png icon inside
      //
      //   theme='dark'  (default, over Lock shade)
      //     bg rgba(23,23,26,0.6) + backdrop-blur; title #efeef2 / sub #cfcccf
      //   theme='light' (over Home / List / Detail day UI)
      //     bg #ffffff; title #000 / sub #333 — pops against light app content
      var ncv = (comp && comp.variant) || {};
      var ncTheme = ncv.theme === 'light' ? 'light' : 'dark';
      var ncTitle = ncv.title || ncv.app || 'Title';
      var ncBody  = ncv.body  || ncv.subtitle || '';
      var ncTime  = ncv.time  || '';
      var ncAccent= ncv.accent|| '#d5d5d5';
      var ncIcon  = ncv.icon  || null;
      var ncGlyph = ncv.glyph || '';
      var ncShowSub = !!ncBody;

      var ncSurfRoot = _themeSurfaceStyleRoot();
      var ncBg, ncBlur, ncTitleColor, ncTimeColor, ncSubColor, ncChevronColor;
      if (ncTheme === 'light') {
        ncBg = '#ffffff';
        ncBlur = '';
        ncTitleColor = '#000000';
        ncTimeColor = '#555555';
        ncSubColor = '#333333';
        ncChevronColor = '#222222';
      } else if (ncSurfRoot === 'neon') {
        ncBg = '#ffffff';
        ncBlur = '';
        ncTitleColor = 'var(--text-primary,#050805)';
        ncTimeColor = 'var(--text-secondary,rgba(5,8,5,0.72))';
        ncSubColor = 'var(--text-secondary,rgba(5,8,5,0.72))';
        ncChevronColor = 'var(--text-primary,#050805)';
      } else {
        ncBg = 'rgba(23,23,26,0.6)';
        ncBlur = '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);';
        ncTitleColor = 'var(--text-primary,#efeef2)';
        ncTimeColor = 'var(--text-secondary,#d5d5d5)';
        ncSubColor = 'var(--text-secondary,#cfcccf)';
        ncChevronColor = 'var(--text-primary,#ffffff)';
      }

      // 56×56 circular app icon. Uses the png if provided, else a colored
      // circle with the glyph fallback. Matches Figma Shape (548:2740).
      var ncIconHTML = ncIcon
        ? '<img src="app-icons/' + ncIcon + '" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;object-fit:cover;"/>'
        : '<div style="width:40px;height:40px;border-radius:50%;background:' + ncAccent +
            ';display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
            'color:#fff;font-size:18px;font-weight:700;line-height:1;">' + ncGlyph + '</div>';

      var ncSurface = ncTheme === 'light'
        ? 'background:' + ncBg + ';' + ncBlur
        : (ncSurfRoot === 'neon'
          ? 'background:' + ncBg + ';border:var(--surface-border);box-shadow:var(--surface-shadow);-webkit-backdrop-filter:none;backdrop-filter:none;'
          : _G('panel'));
      return '<div style="width:415px;min-height:64px;height:auto;max-width:100%;' +
        ncSurface +
        'border-radius:53px;padding:12px 24px 12px 16px;box-sizing:border-box;' +
        'display:flex;align-items:center;gap:10px;overflow:hidden;font-family:var(--font);">' +
        ncIconHTML +
        // Stacked unit — title+time row (baseline aligned) on top, subtitle below
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:9px;overflow:hidden;">' +
          '<div style="display:flex;align-items:baseline;gap:20px;white-space:nowrap;overflow:hidden;line-height:1.3;">' +
            '<span style="font-size:20px;font-weight:500;color:' + ncTitleColor + ';overflow:hidden;text-overflow:ellipsis;">' + ncTitle + '</span>' +
            (ncTime ? '<span style="font-size:18px;font-weight:700;color:#E3DBC8;flex-shrink:0;">' + ncTime + '</span>' : '') +
          '</div>' +
          (ncShowSub
            ? '<div style="font-size:16px;font-weight:500;color:#8DE7E7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;">' + ncBody + '</div>'
            : '') +
        '</div>' +
        // Chevron-down expand affordance (Figma node 745:7185, opacity 0.8)
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;opacity:0.8;"><path d="M6 9l6 6 6-6" stroke="' + ncChevronColor + '" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>' +
      '</div>';
    }

    case 'notif-card-ai': {
      // Notification variant with AI blue→green gradient + animated
      // shimmer overlay (slow, ambient — signals "AI is processing"
      // without being noisy). Sparkle glyph in a glass circle. App
      // name + time on top line, body below. Empty fallbacks return
      // empty rather than the "Title/Subtitle" placeholder antipattern.
      var naiv = (comp && comp.variant) || {};
      var aiTheme = naiv.theme === 'light' ? 'light' : 'dark';
      var aiTitle = (naiv.title && naiv.title !== 'Title') ? naiv.title : '';
      var aiSub   = (naiv.subtitle && naiv.subtitle !== 'Subtitle') ? naiv.subtitle : (naiv.body || '');
      var aiTime  = naiv.time || '';
      var aiSurface = _themeSurfaceStyleRoot();
      var aiTitleColor = aiTheme === 'light' ? '#111111' : 'var(--text-primary,#efeef2)';
      var aiTimeColor  = aiTheme === 'light' ? '#444444' : 'var(--text-secondary,rgba(239,238,242,0.7))';
      var aiSubColor   = aiTheme === 'light' ? '#222222' : 'var(--text-secondary,rgba(239,238,242,0.85))';
      var aiChevColor  = aiTheme === 'light' ? '#111111' : 'var(--text-primary,#ffffff)';
      var aiSparkFill = aiSurface === 'neon'
        ? '#ffffff'
        : (aiTheme === 'light' ? '#111111' : 'var(--text-primary,#ffffff)');
      // Richer gradient: blue → purple → teal — three-stop AI signature.
      // Theme-driven via --card-ai-grad. Light mode keeps a stronger
      // gradient (no backdrop blur); dark mode uses a translucent one.
      var aiGrad = (aiSurface === 'flat' || aiSurface === 'neon')
        ? 'var(--card-ai-grad, var(--surface-bg, rgba(23,23,26,0.80)))'
        : (aiTheme === 'light'
          ? 'linear-gradient(120deg, rgba(102,161,243,1) 0%, rgba(167,139,250,1) 50%, rgba(34,201,166,1) 100%)'
          : 'var(--card-ai-grad, linear-gradient(120deg, rgba(102,161,243,0.45) 0%, rgba(167,139,250,0.45) 50%, rgba(34,201,166,0.45) 100%))');
      var aiSurfaceStyle = aiSurface === 'glass' ? _G('panel') : 'background:' + aiGrad + ';';
      // Shimmer overlay — animated white sweep, very subtle. Speed
      // tunable via --card-ai-shimmer-speed for theme variations.
      var shimmerSpeed = (getComputedStyle(document.documentElement).getPropertyValue('--card-ai-shimmer-speed') || '3.6s').trim();
      var shimmerOff = shimmerSpeed === '0s' || shimmerSpeed === '0ms';
      var shimmer = (aiSurface === 'flat' || aiSurface === 'neon' || shimmerOff) ? '' : '<div style="position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,transparent 35%,rgba(255,255,255,0.10) 50%,transparent 65%,transparent 100%);background-size:300% 100%;animation:aiShimmer var(--card-ai-shimmer-speed,3.6s) linear infinite;pointer-events:none;border-radius:inherit;"></div>';
      var aiIconBubble = aiSurface === 'neon'
        ? 'background:var(--surface-bg,#b8ff42);-webkit-backdrop-filter:none;backdrop-filter:none;border:1px solid rgba(5,8,5,0.14);'
        : 'background:rgba(255,255,255,0.22);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.3);';
      return '<div style="position:relative;width:415px;min-height:64px;height:auto;max-width:100%;' + aiSurfaceStyle + 'border-radius:53px;padding:12px 24px 12px 16px;display:flex;align-items:center;gap:10px;box-sizing:border-box;overflow:hidden;">' +
        shimmer +
        '<div style="position:relative;z-index:1;width:40px;height:40px;border-radius:50%;' + aiIconBubble + 'flex-shrink:0;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="28" height="31" viewBox="0 0 39 43" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M25.3011 4.73334C25.6795 4.9781 25.8481 5.34637 26.0017 5.75821C26.026 5.82177 26.026 5.82177 26.0508 5.88662C26.0853 5.97691 26.1196 6.06727 26.1537 6.1577C26.2429 6.39394 26.3334 6.62966 26.4237 6.86546C26.4504 6.93509 26.4504 6.93509 26.4775 7.00612C26.619 7.37572 26.7662 7.74276 26.9173 8.10851C27.0696 8.478 27.216 8.84828 27.3539 9.22346C27.5614 9.78572 27.7836 10.3423 28.0027 10.9001C28.0992 11.1457 28.1954 11.3915 28.2913 11.6374C28.5489 12.2969 28.8079 12.9557 29.071 13.6131C29.2606 14.0868 29.4451 14.5619 29.6212 15.0408C29.6432 15.1003 29.6652 15.1597 29.6879 15.221C29.7001 15.2681 29.7123 15.3151 29.7248 15.3636C29.8356 15.5711 29.9984 15.6333 30.2038 15.7262C30.288 15.7663 30.3722 15.8064 30.4563 15.8466C30.5006 15.8673 30.5449 15.8881 30.5905 15.9095C30.8196 16.0182 31.0454 16.1332 31.2717 16.2477C31.3633 16.2937 31.455 16.3397 31.5467 16.3857C31.9661 16.5962 32.3855 16.8067 32.8049 17.0172C32.7858 17.0937 32.7668 17.1702 32.7472 17.249C32.8234 17.249 32.8995 17.249 32.9781 17.249C32.9781 17.2872 32.9781 17.3255 32.9781 17.3649C33.0733 17.384 33.1685 17.4031 33.2667 17.4228C33.2667 17.461 33.2667 17.4993 33.2667 17.5387C33.3047 17.5387 33.3428 17.5387 33.3821 17.5387C33.3821 17.5769 33.3821 17.6152 33.3821 17.6546C33.4152 17.6334 33.4483 17.6123 33.4824 17.5905C33.613 17.5387 33.613 17.5387 33.7345 17.572C33.7742 17.5932 33.8138 17.6145 33.8547 17.6365C33.8948 17.657 33.9349 17.6775 33.9762 17.6987C34.0748 17.7705 34.0748 17.7705 34.1325 17.9443C34.1818 17.9313 34.2312 17.9183 34.282 17.9049C34.5276 17.8817 34.6389 17.9395 34.8569 18.0525C34.9099 18.0794 34.9099 18.0794 34.964 18.1069C35.0781 18.1653 35.1915 18.2249 35.3049 18.2847C35.383 18.3251 35.4611 18.3655 35.5393 18.4058C35.6931 18.4853 35.8467 18.5653 36.0001 18.6458C36.1785 18.7392 36.3581 18.8299 36.5385 18.9194C36.6264 18.9637 36.7142 19.008 36.8021 19.0524C36.8412 19.0715 36.8803 19.0905 36.9205 19.1101C37.0949 19.2005 37.1822 19.2585 37.2738 19.4359C37.2848 19.479 37.2958 19.5222 37.3071 19.5667C37.3702 19.5715 37.4333 19.5762 37.4983 19.5812C37.7112 19.6246 37.7112 19.6246 37.823 19.7369C37.8844 19.8564 37.8844 19.8564 37.8844 19.9723C37.9415 19.9914 37.9986 20.0105 38.0575 20.0302C38.0575 20.145 38.0575 20.2597 38.0575 20.3779C38.0956 20.3779 38.1337 20.3779 38.173 20.3779C38.3159 20.5932 38.3135 20.7659 38.2884 21.0153C38.2307 21.1891 38.2307 21.1891 38.173 21.305C38.1158 21.305 38.0587 21.305 37.9998 21.305C37.9808 21.4006 37.9617 21.4962 37.9421 21.5947C37.8459 21.5947 37.7497 21.5947 37.6535 21.5947C37.7106 21.6712 37.7678 21.7477 37.8266 21.8265C37.3049 22.1044 36.7831 22.3818 36.2537 22.6449C35.9575 22.7921 35.6646 22.944 35.3735 23.1012C35.0885 23.255 34.8021 23.4044 34.5124 23.5489C34.4728 23.5687 34.4331 23.5886 34.3923 23.609C34.2672 23.6716 34.1421 23.734 34.017 23.7965C32.6597 24.4716 32.6597 24.4716 31.3149 25.1714C30.1989 25.7675 30.1989 25.7675 29.9175 25.8649C29.7443 25.9795 29.7119 26.1203 29.639 26.3129C29.6244 26.3508 29.6098 26.3887 29.5948 26.4277C29.5469 26.5523 29.5002 26.6773 29.4534 26.8023C29.4202 26.8895 29.3868 26.9766 29.3534 27.0638C29.2853 27.2414 29.2176 27.4191 29.1502 27.597C29.0125 27.9598 28.8703 28.3207 28.7283 28.6818C28.6765 28.8141 28.6247 28.9465 28.573 29.0788C28.5475 29.1439 28.5221 29.209 28.4958 29.276C28.4164 29.4791 28.3371 29.6823 28.2578 29.8855C27.9778 30.6021 27.6967 31.3182 27.4093 32.0319C27.2816 32.3503 27.1587 32.6703 27.0393 32.992C26.8601 33.4745 26.6731 33.9538 26.4844 34.4326C26.4528 34.5132 26.4211 34.5937 26.3895 34.6742C26.3271 34.8329 26.2646 34.9915 26.2018 35.15C26.1387 35.3095 26.0767 35.4694 26.0152 35.6295C25.9849 35.7077 25.9546 35.7858 25.9243 35.864C25.8845 35.9679 25.8845 35.9679 25.8438 36.0739C25.6777 36.4441 25.4419 36.6352 25.081 36.8046C24.6911 36.9425 24.3367 36.9038 23.9591 36.7431C23.4783 36.462 23.2929 35.9363 23.1005 35.4394C23.0735 35.3713 23.0465 35.3032 23.0187 35.2331C22.9467 35.0508 22.8754 34.8682 22.8046 34.6854C22.7618 34.575 22.7189 34.4647 22.676 34.3544C22.5013 33.9053 22.3283 33.4555 22.156 33.0054C21.2361 30.6032 21.2361 30.6033 20.2774 28.2165C20.1538 27.9147 20.0354 27.6116 19.9222 27.3057C19.9085 27.269 19.8947 27.2323 19.8806 27.1946C19.8103 27.0064 19.7427 26.8177 19.678 26.6276C19.5326 26.1702 19.5326 26.1702 19.2187 25.8281C19.1308 25.7861 19.0415 25.7466 18.9518 25.7086C18.8476 25.6563 18.7434 25.6039 18.6396 25.5508C18.5199 25.49 18.3996 25.4304 18.2792 25.3709C18.0295 25.2467 17.7834 25.1162 17.5376 24.9843C17.1498 24.7767 16.7589 24.5764 16.3652 24.3805C16.1399 24.2683 15.9149 24.1555 15.6901 24.0425C15.375 23.8843 15.0597 23.7264 14.7442 23.5688C13.2878 22.8409 13.2877 22.8409 12.6107 22.4781C12.4161 22.3739 12.2211 22.2717 12.0227 22.175C11.9674 22.148 11.9674 22.148 11.9109 22.1204C11.8142 22.0735 11.7171 22.0272 11.62 21.981C11.2066 21.7488 10.968 21.4667 10.8131 21.0153C10.7397 20.6322 10.8286 20.3401 10.9991 19.9967C11.28 19.6125 11.6681 19.4074 12.0874 19.2036C12.1432 19.1759 12.199 19.1482 12.2564 19.1197C12.434 19.0315 12.612 18.9442 12.79 18.8569C13.0225 18.7421 13.2549 18.6271 13.4872 18.5119C13.544 18.4838 13.6009 18.4557 13.6595 18.4268C14.1175 18.1996 14.5702 17.9632 15.0212 17.7221C15.4038 17.5178 15.7928 17.3261 16.1811 17.1331C16.8027 16.8239 17.4229 16.5129 18.0342 16.1835C18.2528 16.0663 18.4716 15.9545 18.6981 15.8531C18.7403 15.8338 18.7825 15.8144 18.8259 15.7944C18.9043 15.7588 18.9833 15.7245 19.063 15.6919C19.3411 15.5638 19.4268 15.4163 19.531 15.1435C19.5494 15.0926 19.5678 15.0417 19.5867 14.9892C19.6336 14.8732 19.6809 14.7573 19.7283 14.6416C19.7822 14.5064 19.8361 14.3712 19.8897 14.236C19.9043 14.1994 19.9188 14.1628 19.9338 14.1252C20.3082 13.1837 20.6738 12.2388 21.0402 11.2942C21.3045 10.6132 21.571 9.93297 21.8378 9.25288C21.867 9.17846 21.8962 9.10404 21.9254 9.02962C21.9404 8.99138 21.9554 8.95315 21.9709 8.91375C22.0018 8.8348 22.0328 8.75585 22.0638 8.6769C22.1424 8.47642 22.2211 8.27598 22.3 8.07559C22.4482 7.69877 22.5959 7.32175 22.7412 6.94381C22.8085 6.76917 22.876 6.59466 22.9436 6.42015C22.9756 6.33731 23.0074 6.25439 23.0391 6.17141C23.5119 4.93136 23.5119 4.93136 24.0224 4.68106C24.4736 4.4917 24.86 4.53907 25.3011 4.73334Z" fill="white"/>' +
            '<path d="M10.5335 13.4071C10.9553 13.6269 11.1189 14.0585 11.264 14.4919C11.3155 14.6831 11.3326 14.8483 11.3326 15.0472C11.3689 15.1254 11.4077 15.2026 11.448 15.2789C11.467 15.3375 11.4861 15.396 11.5057 15.4564C11.5581 15.6346 11.5581 15.6346 11.6789 15.8004C11.6884 15.8602 11.6979 15.9199 11.7077 15.9815C11.7173 16.0365 11.7268 16.0914 11.7366 16.1481C11.7747 16.1672 11.8128 16.1863 11.852 16.206C11.8592 16.2598 11.8663 16.3136 11.8737 16.369C11.8929 16.5583 11.8929 16.5583 12.0252 16.6696C12.1733 16.8182 12.1719 16.929 12.1984 17.1331C12.1659 17.1494 12.1334 17.1656 12.0999 17.1824C10.8346 17.8205 9.63034 18.4896 9.13915 19.9143C8.9115 20.7383 9.02966 21.5367 9.43271 22.2911C9.89608 23.0154 10.5319 23.4606 11.294 23.8372C11.3761 23.8781 11.4581 23.919 11.5402 23.9599C11.5822 23.9807 11.6241 24.0016 11.6674 24.0231C11.8723 24.125 12.0768 24.2279 12.2813 24.3307C12.3636 24.3719 12.4458 24.4132 12.528 24.4545C12.6931 24.5373 12.8581 24.6202 13.0232 24.703C13.0639 24.7235 13.1047 24.7439 13.1467 24.765C13.2286 24.8061 13.3104 24.8472 13.3923 24.8883C13.5947 24.9899 13.7972 25.0915 13.9998 25.1928C14.4561 25.421 14.9106 25.6523 15.3622 25.8897C15.443 25.9319 15.443 25.9319 15.5254 25.975C15.6865 26.0595 15.8473 26.1447 16.008 26.2301C16.0659 26.2606 16.1238 26.2912 16.1835 26.3226C16.2401 26.3529 16.2967 26.3832 16.355 26.4143C16.4316 26.4551 16.4316 26.4551 16.5098 26.4967C16.6332 26.5719 16.7175 26.6474 16.8161 26.7516C16.8566 26.7719 16.897 26.7922 16.9387 26.8132C17.047 26.8675 17.047 26.8675 17.1047 26.9834C17.1511 26.9917 17.1975 27.0001 17.2454 27.0087C17.3933 27.0413 17.3933 27.0413 17.5087 27.2151C17.5087 27.2725 17.5087 27.3299 17.5087 27.389C17.4746 27.4065 17.4404 27.4241 17.4052 27.4421C17.3596 27.4664 17.314 27.4907 17.267 27.5157C17.2222 27.5392 17.1773 27.5628 17.1311 27.587C16.9813 27.6763 16.9813 27.6763 16.8519 27.8201C16.4636 28.2006 15.9116 28.4226 15.373 28.4319C15.373 28.4702 15.373 28.5084 15.373 28.5478C15.3385 28.555 15.304 28.5622 15.2684 28.5695C15.127 28.6031 15.127 28.6031 14.969 28.7216C14.8139 28.7289 14.8139 28.7289 14.6804 28.7216C14.6423 28.7981 14.6042 28.8746 14.5649 28.9534C14.4507 28.9343 14.3364 28.9152 14.2186 28.8955C14.2377 28.972 14.2567 29.0484 14.2763 29.1272C14.143 29.1464 14.0097 29.1655 13.8723 29.1852C13.8723 29.2234 13.8723 29.2617 13.8723 29.3011C13.7961 29.3202 13.7199 29.3393 13.6414 29.359C13.6414 29.3973 13.6414 29.4355 13.6414 29.4749C13.6795 29.4749 13.7176 29.4749 13.7569 29.4749C13.7222 29.8225 13.6013 30.1525 13.3528 30.402C13.3432 30.5806 13.3432 30.5806 13.3528 30.7496C13.3147 30.7496 13.2766 30.7496 13.2374 30.7496C13.2284 30.8375 13.2284 30.8375 13.2193 30.9271C13.177 31.1703 13.1159 31.3412 13.0065 31.5608C12.9684 31.58 12.9303 31.5991 12.891 31.6188C12.8934 31.6917 12.8958 31.7646 12.8982 31.8397C12.9048 32.0412 12.8945 32.0772 12.7756 32.2561C12.7184 32.2561 12.6613 32.2561 12.6024 32.2561C12.6143 32.2884 12.6262 32.3207 12.6385 32.3539C12.6667 32.5286 12.6243 32.622 12.5447 32.7776C12.5066 32.7968 12.4685 32.8159 12.4293 32.8356C12.3894 32.985 12.3894 32.985 12.3643 33.1579C12.3498 33.2458 12.3498 33.2458 12.335 33.3356C12.328 33.3809 12.321 33.4262 12.3138 33.4729C12.2567 33.4921 12.1995 33.5112 12.1407 33.5309C12.1597 33.5883 12.1788 33.6456 12.1984 33.7047C12.1443 33.8604 12.1443 33.8604 12.0829 33.9944C12.0448 33.9944 12.0067 33.9944 11.9675 33.9944C11.9675 34.1092 11.9675 34.2239 11.9675 34.3421C11.9294 34.3421 11.8913 34.3421 11.852 34.3421C11.8431 34.4281 11.8431 34.4281 11.834 34.5159C11.7996 34.7641 11.7143 34.9795 11.6212 35.2112C11.5831 35.2112 11.545 35.2112 11.5057 35.2112C11.5057 35.2686 11.5057 35.326 11.5057 35.3851C11.4909 35.4735 11.4739 35.5617 11.4552 35.6494C11.4411 35.7177 11.4412 35.7177 11.4268 35.7873C11.3903 35.9065 11.3903 35.9065 11.2748 36.0224C11.2558 36.0798 11.2367 36.1372 11.2171 36.1963C11.1594 36.3701 11.1594 36.3701 11.0439 36.486C11.0463 36.5397 11.0487 36.5935 11.0512 36.6489C11.0421 36.8806 10.9608 36.9519 10.8131 37.1233C10.8131 37.1807 10.8131 37.2381 10.8131 37.2972C10.4769 37.5012 10.212 37.4807 9.83022 37.4085C9.56911 37.3272 9.50091 37.2476 9.37003 37.0075C9.28706 36.7938 9.28706 36.7938 9.25459 36.6019C9.29268 36.5445 9.33078 36.4871 9.37003 36.428C9.29384 36.428 9.21765 36.428 9.13915 36.428C9.09458 36.3037 9.05011 36.1794 9.00567 36.055C8.99239 36.018 8.97911 35.9809 8.96543 35.9427C8.89306 35.7398 8.82438 35.5364 8.76035 35.3307C8.70825 35.1697 8.64611 35.0334 8.55833 34.8889C8.43165 34.6633 8.3885 34.4775 8.33105 34.2262C8.2989 34.1635 8.2989 34.1635 8.26611 34.0995C8.20075 33.9635 8.20737 33.8536 8.2156 33.7047C8.17751 33.7047 8.13941 33.7047 8.10016 33.7047C7.96591 33.4941 7.97533 33.3124 7.98472 33.0673C7.94662 33.0673 7.90853 33.0673 7.86928 33.0673C7.79674 32.899 7.75383 32.7895 7.75383 32.6038C7.70227 32.6028 7.70227 32.6028 7.64967 32.6018C7.52295 32.5459 7.52295 32.5459 7.43231 32.365C7.4015 32.282 7.37167 32.1986 7.34257 32.1149C7.30772 32.0201 7.27285 31.9254 7.23795 31.8306C7.21913 31.7786 7.2003 31.7265 7.18091 31.6729C7.06508 31.3554 6.94374 31.04 6.82308 30.7243C6.79956 30.6619 6.77603 30.5996 6.7518 30.5353C6.68327 30.355 6.61284 30.1756 6.54169 29.9964C6.50786 29.9076 6.50786 29.9076 6.47334 29.8169C6.36859 29.5599 6.30012 29.3952 6.07766 29.2239C6.00936 29.1956 5.94105 29.1673 5.87068 29.1381C5.78819 29.1015 5.70582 29.0646 5.62356 29.0274C5.57743 29.0072 5.53129 28.9869 5.48376 28.9661C5.17388 28.8242 4.87372 28.6626 4.57195 28.5044C4.47156 28.4521 4.47156 28.4521 4.36915 28.3988C3.88894 28.1482 3.41342 27.8899 2.93924 27.6281C2.41141 27.3376 1.87393 27.0689 1.33189 26.8064C0.308671 26.3076 0.308671 26.3076 0.0769008 25.9223C-0.0201404 25.5631 -0.0507361 25.2733 0.13823 24.9409C0.362589 24.586 0.771197 24.3917 1.13821 24.2152C1.22003 24.175 1.30183 24.1347 1.38361 24.0944C1.42528 24.074 1.46696 24.0535 1.5099 24.0324C1.71201 23.9324 1.91237 23.829 2.1127 23.7254C2.15257 23.7049 2.19244 23.6843 2.23352 23.6631C2.35765 23.599 2.48173 23.5348 2.60582 23.4706C2.69412 23.4249 2.78242 23.3793 2.87072 23.3337C3.41405 23.0527 3.95711 22.7713 4.4998 22.4892C4.56269 22.4565 4.62558 22.4238 4.69038 22.3901C4.96907 22.2449 5.24726 22.0989 5.52412 21.9503C5.57047 21.9254 5.61682 21.9005 5.66457 21.8749C5.74844 21.8298 5.83219 21.7844 5.9158 21.7387C6.18281 21.5947 6.18281 21.5947 6.3108 21.5947C6.32076 21.5638 6.33072 21.5329 6.34098 21.5011C6.45237 21.1603 6.57496 20.8248 6.7029 20.4899C6.73328 20.41 6.73328 20.41 6.76428 20.3285C6.82827 20.1602 6.89241 19.992 6.95656 19.8238C7.00027 19.7089 7.04398 19.5941 7.08767 19.4792C7.19417 19.1993 7.3008 18.9194 7.40751 18.6396C7.46465 18.6396 7.52179 18.6396 7.58067 18.6396C7.66092 18.4481 7.66092 18.4481 7.72001 18.2494C7.76719 18.0663 7.83119 17.8906 7.89453 17.7125C7.91946 17.642 7.94438 17.5715 7.97006 17.4989C8.02588 17.3508 8.08488 17.2148 8.15788 17.0751C8.19711 16.9789 8.23577 16.8824 8.27333 16.7854C8.23523 16.7854 8.19713 16.7854 8.15788 16.7854C8.29343 16.3653 8.44576 15.9533 8.60466 15.5416C8.71059 15.2663 8.81334 14.9906 8.90939 14.7117C8.92857 14.6575 8.94775 14.6032 8.96752 14.5473C9.00388 14.4443 9.03919 14.3408 9.07324 14.2369C9.20458 13.8706 9.39455 13.6439 9.71636 13.4248C9.99149 13.3327 10.2545 13.3168 10.5335 13.4071Z" fill="white"/>' +
          '</svg>' +
        '</div>' +
        '<div style="position:relative;z-index:1;flex:1;min-width:0;display:flex;flex-direction:column;gap:9px;overflow:hidden;">' +
          (aiTitle || aiTime
            ? '<div style="display:flex;gap:20px;align-items:baseline;white-space:nowrap;overflow:hidden;line-height:1.3;">' +
                (aiTitle ? '<span style="font-size:20px;font-weight:500;color:' + aiTitleColor + ';">' + aiTitle + '</span>' : '') +
                (aiTime  ? '<span style="font-size:18px;font-weight:700;color:#E3DBC8;">' + aiTime + '</span>'   : '') +
              '</div>'
            : '') +
          (aiSub
            ? '<div style="font-size:16px;font-weight:500;color:#8DE7E7;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + aiSub + '</div>'
            : '') +
        '</div>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="position:relative;z-index:1;opacity:0.8;flex-shrink:0;"><path d="M7 10l5 5 5-5" stroke="' + aiChevColor + '" strokeWidth="1.5" strokeLinecap="round"/></svg>' +
      '</div>';
    }

    case 'output-chip': {
      // Small pill — media device indicator ("Phone speaker").
      var ocv = (comp && comp.variant) || {};
      var ocLabel = ocv.label || 'Phone speaker';
      return '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;background:rgba(0,0,0,0.35);border-radius:999px;font-size:var(--font-size-sm,16px);color:#fff;white-space:nowrap;margin:auto;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2" stroke="#fff" strokeWidth="1.5"/><circle cx="12" cy="17" r="1" fill="#fff"/></svg>' +
        '<span>' + ocLabel + '</span>' +
      '</div>';
    }

    case 'progress-track': {
      // Time progress bar with left/right timestamps.
      var ptv = (comp && comp.variant) || {};
      var left  = ptv.left  || '02:41';
      var right = ptv.right || '03:24';
      var ptPct = ptv.percent != null ? ptv.percent : 45;
      return '<div style="width:100%;height:100%;max-width:100%;min-width:0;display:flex;flex-direction:column;gap:3px;justify-content:center;padding:0 4px;box-sizing:border-box;overflow:hidden;">' +
        '<div style="height:3px;background:rgba(255,255,255,0.25);border-radius:2px;position:relative;"><div style="position:absolute;left:0;top:0;bottom:0;width:' + ptPct + '%;background:#fff;border-radius:2px;"></div><div style="position:absolute;left:' + ptPct + '%;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#fff;"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:var(--font-size-sm,16px);color:rgba(255,255,255,0.75);">' +
          '<span>' + left + '</span><span>' + right + '</span>' +
        '</div>' +
      '</div>';
    }

    case 'clock':         // canonical Scene template name
    case 'lock-clock':    // kebab alias
    case 'lock-time': {   // legacy alias
      // Huge digital time display — Samsung lock-screen signature.
      // Delegates to GalaxyAtomics.Clock when available so the render
      // matches the canned Screen/Lock scene 1:1: HH on line 1, MM on
      // line 2 (NO COLON between them), FONT_CLOCK family
      // ('SamsungNrDefault-V6'), weight 400, size 112, line-height 82,
      // gap 12. Earlier version rendered "HH:MM" on one line with the
      // Inter fallback and weight 200 — visually inconsistent with the
      // canonical Scene/Lock.
      var lcv = (comp && comp.variant) || {};
      var _now = new Date();
      var _HH = lcv.HH != null ? String(lcv.HH)
        : String(_now.getHours()).padStart(2, '0');
      var _MM = lcv.MM != null ? String(lcv.MM)
        : String(_now.getMinutes()).padStart(2, '0');
      // `A` (= window.GalaxyAtomics) is already in scope from the top
      // of renderAtomicForRole — reuse it directly.
      if (A && typeof A.Clock === 'function') {
        return A.Clock({
          time:       [_HH, _MM],
          fontSize:   lcv.fontSize || 112,
          lineHeight: lcv.lineHeight || 82,
          gap:        lcv.gap != null ? lcv.gap : 12,
          family:     lcv.family || null
        });
      }
      // Fallback (when GalaxyAtomics hasn't loaded yet) — still
      // renders 2-line no-colon using the canonical clock font stack.
      // Space Grotesk paired with Inter structural fallback, matching
      // the project-wide Inter + Space Grotesk standardization.
      var lcSize = lcv.fontSize || 112;
      var lcLh   = lcv.lineHeight || 82;
      var lcGap  = lcv.gap != null ? lcv.gap : 12;
      var lcFont = lcv.family || "'Space Grotesk', Inter, system-ui, sans-serif";
      var baseStyle = 'font-family:' + lcFont + ';font-weight:500;font-size:' + lcSize + 'px;' +
                      'line-height:' + lcLh + 'px;color:#FFFFFF;text-align:center;white-space:nowrap;';
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:' + lcGap + 'px;">' +
        '<div style="' + baseStyle + '">' + _HH + '</div>' +
        '<div style="' + baseStyle + '">' + _MM + '</div>' +
      '</div>';
    }

    case 'weatherDate':       // canonical Scene template name
    case 'weather-date': {
      // Canonical Samsung Lock weather-date row — matches
      // GalaxyAtomics.WeatherDate exactly so the agent path renders
      // identically to Scene/Lock:
      //   layout  : [date] [moon-or-condition icon 19×19] [temp°]
      //   font    : Inter, 24px / 400 / line-height 20px / #FFFFFF
      //   gap     : 10px between items
      //   width   : 192 centered (CANONICAL_ROLE_SIZES enforces this)
      // Earlier revision rendered icon-first + bullet separator + 14px
      // font-weight 500 — visually off by a mile. Now we delegate to
      // GalaxyAtomics.WeatherDate when available, with a condition-
      // aware icon override via an inline wrapper.
      //
      // variant fields accepted:
      //   condition → 'sunny' | 'cloudy' | 'rain' | 'snow' | 'moon'
      //                (default 'moon' — matches canonical night look)
      //   temp      → numeric '24' or string '24°' (degree auto-appended)
      //   date      → string 'Sat, May 3'
      var wdv = (comp && comp.variant) || {};
      var wdCond = wdv.condition || 'moon';
      // Strip trailing ° if present; canonical appends it.
      var wdTempRaw = (wdv.temp != null ? wdv.temp : 24);
      var wdTempStr = String(wdTempRaw).replace(/[°\s]+$/, '');
      var wdDate = wdv.date || 'Sat, May 3';

      // Default look = moon.svg (canonical Lock is night-themed).
      // For other conditions use inline SVGs so we don't depend on
      // missing PNG/SVG assets. Sun/cloud/rain/snow all styled to
      // match the 19×19 footprint of moon.svg.
      var WEATHER_INLINE = {
        'sunny':  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#fff"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>',
        'cloudy': '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 17H7z" fill="#fff"/></svg>',
        'rain':   '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 14a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 14H7z" fill="#fff"/><path d="M9 17v3M12 17v3M15 17v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>',
        'snow':   '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 13a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 13H7z" fill="#fff"/><path d="M8 17v2M12 17v2M16 17v2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>'
      };
      // Canonical moon.svg lives in assets/figma/lock-screen — if it
      // loads we use that; otherwise inline moon SVG fallback.
      var moonInline =
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none">' +
          '<path d="M20 14.5A8 8 0 1 1 9.5 4c-.3 1-.5 2-.5 3a7 7 0 0 0 11 7.5z" fill="#fff"/>' +
        '</svg>';
      var iconSvg = WEATHER_INLINE[wdCond] || moonInline;

      // Canonical typography: Inter 24/400/20 line-height
      var textStyle = "font-family:'One UI Sans APP VF', Inter, system-ui, sans-serif;" +
                      'font-weight:500;font-size:24px;line-height:20px;color:#FFFFFF;' +
                      'white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.35);';
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:10px;">' +
        '<span style="' + textStyle + '">' + wdDate + '</span>' +
        '<div style="position:relative;width:19px;height:19px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' + iconSvg + '</div>' +
        '<span style="' + textStyle + '">' + wdTempStr + '\u00b0</span>' +
      '</div>';
    }

    case 'lockIndicator':       // canonical Scene template name
    case 'lock-indicator': {
      // Small padlock / fingerprint / face-ID glyph shown just below the
      // status bar. variant.state: 'locked' | 'unlocked' | 'fingerprint'.
      var liv = (comp && comp.variant) || {};
      var liState = liv.state || 'locked';
      var LOCK_SVGS = {
        'locked':      '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" fill="none"/>',
        'unlocked':    '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M8 11V7a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.8" fill="none"/>',
        'fingerprint': '<path d="M12 5a7 7 0 0 0-7 7v3M19 12a7 7 0 0 0-3-5.7M19 15v3M8 21a7 7 0 0 0 2-5v-4a2 2 0 0 1 4 0v5a9 9 0 0 1-1 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>'
      };
      var liSvg = LOCK_SVGS[liState] || LOCK_SVGS['locked'];
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9);filter:drop-shadow(0 1px 4px rgba(0,0,0,0.35));">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color:currentColor;">' + liSvg + '</svg>' +
      '</div>';
    }

    case 'shortcutLeft':
    case 'shortcutRight': {
      // Canonical Samsung lockscreen shortcut — 47×47 glass circle with
      // a single glyph (phone on the left by default, camera on the
      // right). variant.icon picks the glyph.
      var scv = (comp && comp.variant) || {};
      var scIcon = scv.icon || (comp.role === 'shortcutRight' ? 'camera' : 'phone');
      var SHORTCUT_SVGS = {
        'phone':  '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2 17 17 0 0 1-16-16 2 2 0 0 1 2-2z" fill="currentColor"/>',
        'camera': '<path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" fill="none"/><circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>',
        'flash':  '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/>',
        'qr':     '<rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M14 14h3v3M19 14v7M14 19h3v2" stroke="currentColor" strokeWidth="1.6" fill="none"/>'
      };
      var scSvg = SHORTCUT_SVGS[scIcon] || SHORTCUT_SVGS['phone'];
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
        _G('shortcutCircle') + 'border-radius:50%;color:#fff;' +
      '">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="color:currentColor;">' + scSvg + '</svg>' +
      '</div>';
    }

    case 'gestureBar': {
      // Full-width bottom home-gesture indicator (Samsung's Android home
      // bar). Thin light pill, 134×5 centered in a 451×24 band.
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">' +
        '<div style="width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,0.85);"></div>' +
      '</div>';
    }

    case 'unlock-hint': {
      // "Swipe up to unlock" text with optional up-chevron above. Centered
      // at the bottom of the lock screen, just above the shortcut row.
      var uhv = (comp && comp.variant) || {};
      var uhText = uhv.text != null ? uhv.text : 'Swipe up to unlock';
      var uhArrow = uhv.showArrow !== false;
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:rgba(255,255,255,0.8);font-family:var(--font);font-size:var(--font-size-xs,14px);font-weight:500;text-shadow:0 1px 4px rgba(0,0,0,0.35);">' +
        (uhArrow
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color:rgba(255,255,255,0.7);"><path d="M7 15l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>'
          : '') +
        '<span>' + uhText + '</span>' +
      '</div>';
    }

    case 'slider-panel': {
      // Figma 1109:10261 (brightness) / 1109:10246 (volume) — a vertical
      // slider PANEL that bundles a track + mode-cap toggle in one glass
      // container. Exact spec:
      //   container: 88×h, bg rgba(23,23,26,0.6) + 1px border + rounded-50
      //               padding 18, flex-col, gap 10
      //   track:      fills remaining vertical space (rotated slider-pill)
      //   cap:        56 circle at bottom, active by default (#d5d5d5 bg)
      //
      // variant:
      //   icon    → slider handle glyph ('brightness' | 'music' | …)
      //   capIcon → mode cap glyph ('moon' | 'mute' | …)
      //   capOn   → cap active state (default true — matches Figma)
      //   percent → slider fill 0..100
      var spnv = (comp && comp.variant) || {};
      var spnPct    = spnv.percent != null ? spnv.percent : 62;
      var spnIcon   = spnv.icon    || 'brightness';
      var spnCapI   = spnv.capIcon || 'moon';
      var spnCapOn  = spnv.capOn !== false; // default true per Figma
      var spnSlider = window.renderAtomicForRole(
        { role: 'slider-pill', variant: { orient: 'vertical', icon: spnIcon, percent: spnPct } },
        { w: 56, h: 200 }
      );
      var spnCap = window.renderAtomicForRole(
        { role: 'toggle-chip', variant: { icon: spnCapI, on: spnCapOn } },
        { w: 56, h: 56 }
      );
      return '<div style="width:100%;height:100%;' +
        'background:rgba(23,23,26,0.6);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
        'border:1px solid rgba(255,255,255,0.2);border-radius:var(--card-radius,' + _R('widget') + ');' +
        'padding:18px;box-sizing:border-box;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;' +
        'overflow:hidden;">' +
        '<div style="flex:1;min-height:0;width:100%;display:flex;align-items:stretch;justify-content:center;">' + spnSlider + '</div>' +
        '<div style="flex-shrink:0;width:56px;height:56px;">' + spnCap + '</div>' +
      '</div>';
    }

    case 'single-toggle': {
      // Figma "Single Toggle" component (1003:13051, 1003:13038, 1006:14473,
      // 1006:14489). Four exact variant combinations:
      //   width='single' + kind='toggle'   → 88×88  icon-only (Figma 987:17561)
      //   width='single' + kind='shortcut' → 88×88  open-arrow only (985:13445)
      //   width='half'   + kind='toggle'   → 199×88 icon + title/sub (544:1012)
      //   width='half'   + kind='shortcut' → 199×88 arrow + title/sub (544:1044)
      // Glass pill: bg rgba(23,23,26,0.6), border 1px rgba(255,255,255,0.2),
      //             rounded 50.
      var stv = (comp && comp.variant) || {};
      var stWidth = stv.width || 'half';
      var stKind  = stv.kind  || 'toggle';
      var stTitle = stv.title || 'Title';
      var stSub   = stv.sub || stv.subtitle || 'Subtitle';
      var stShowSub = stv.showSubtitle !== false;
      var stIcon  = stv.icon || 'add';
      var stOn    = stv.on === true;
      var glass   = 'background:rgba(23,23,26,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:var(--card-radius,' + _R('widget') + ');box-sizing:border-box;';

      // Reusable 56-circle. Delegates to the `toggle-chip` atomic so the
      // full icon library (Wi-Fi / Mobile Data / Bluetooth / …) is picked
      // up correctly — previously this helper was hardcoded to check/plus
      // glyphs, which made every single-toggle render the wrong icon.
      function _stChip(on, iconKey) {
        return window.renderAtomicForRole(
          { role: 'toggle-chip', variant: { icon: iconKey, on: on } },
          { w: 56, h: 56 }
        );
      }
      // Shortcut left icon — 34×34 in a 32.5×35 holder (per Figma). Default
      // is the "open" arrow (navigation cue). `variant.icon` can override
      // with any key in SHORTCUT_ICONS below — e.g. 'song-search' renders
      // the Figma media_volume speaker+waves glyph (node 340:8807) for the
      // Samsung Song Search affordance.
      var SHORTCUT_ICONS = {
        'open':        '<path d="M14 5h5v5M19 5l-9 9M10 7H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>',
        // Figma 340:8807 media_volume — speaker cone + two wave arcs.
        // Proportions match the 19.69%/14.04%/24.53%/14.32% insets at 24×24.
        'song-search':'<path d="M4 10v4h3l4 3.5V6.5L7 10H4z" fill="currentColor"/>' +
                      '<path d="M14 9.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>' +
                      '<path d="M17 6.5a7 7 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>',
        'smart-view': '<rect x="3" y="5" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M10 9l5 2.5-5 2.5V9z" fill="currentColor"/>'
      };
      function _stShortcutIcon(iconKey) {
        var path = SHORTCUT_ICONS[iconKey] || SHORTCUT_ICONS['open'];
        // Holder sized to match the toggle chip's 56 circle footprint, with
        // the SVG rendered at 26px for clear visibility. Figma's raw
        // 32.5×35 + p-13 holder math would clip the glyph to ~7×9, which
        // is what caused the "icons are too small" bug in the reference.
        return '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="color:#fff;">' + path + '</svg>' +
        '</div>';
      }
      // Shortcut variants get `data-shortcut` so the delegated interact-mode
      // click handler can flash a quick press animation — navigation-style
      // feedback without needing to route to a real destination.
      var shortcutAttr = (stKind === 'shortcut') ? ' data-shortcut="1"' : '';

      if (stWidth === 'single') {
        // 88×88 centered. 'toggle' = 56 circle; 'shortcut' = 34 arrow.
        var innerSingle = stKind === 'shortcut' ? _stShortcutIcon(stIcon) : _stChip(stOn, stIcon);
        return '<div' + shortcutAttr + ' style="width:88px;height:88px;max-width:88px;max-height:88px;' + glass +
          'display:flex;align-items:center;justify-content:center;transition:transform 120ms ease,background 160ms ease;' +
          (stKind === 'shortcut' ? 'padding:24px;' : 'padding:10px 0;') + '">' +
          innerSingle +
        '</div>';
      }

      // half: 199×88 — left icon (toggle or shortcut) + title/sub stacked right.
      var leftHalf = stKind === 'shortcut' ? _stShortcutIcon(stIcon) : _stChip(stOn, stIcon);
      var padX = stKind === 'shortcut' ? 'padding:24px 25px 24px 20px;' : 'padding:24px 17px;';
      return '<div' + shortcutAttr + ' style="width:199px;height:88px;max-height:88px;' + glass + padX +
        'display:flex;flex-direction:column;align-items:flex-start;justify-content:center;overflow:hidden;color:#fff;font-family:var(--font);transition:transform 120ms ease,background 160ms ease;">' +
        '<div style="display:flex;align-items:center;gap:10px;width:100%;">' +
          leftHalf +
          '<div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div style="font-size:16px;font-weight:700;color:#efeef2;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + stTitle + '</div>' +
            (stShowSub ? '<div style="font-size:var(--font-size-sm,16px);font-weight:500;color:#cfcccf;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + stSub + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    case 'smart-things': {
      // Figma SmartThings (1006:14505 / 544:1020) — 415×88, glass pill
      // with a device icon + 2-line title/sub on the left and up to 3
      // circular action toggles on the right. Every dimension mirrors the
      // Figma component 1:1. variant.actions = array of up to 3 icon keys.
      var stmv = (comp && comp.variant) || {};
      var stmTitle = stmv.title || 'Title';
      var stmSub   = stmv.sub || stmv.subtitle || 'Subtitle';
      var stmShowSub = stmv.showSubtitle !== false;
      // actionCount: 1 (compact — single output chip on right, as in the
      //              QS compact/minimal reference) or 3 (Full — Figma default).
      // variant.actions explicit array overrides actionCount.
      var stmActionCount = (stmv.actionCount === 1) ? 1 : 3;
      var stmActions = Array.isArray(stmv.actions)
        ? stmv.actions.slice(0, 3)
        : (stmActionCount === 1
          ? ['power']
          : ['smart-view', 'remote', 'power']);
      var stmActiveIdx = (stmv.activeIndex != null) ? stmv.activeIndex : -1;

      // Device icon on the left — Figma 552:1513 "tv outline" glyph.
      //   screen: rounded rectangle (~17.5×11.5) with stroke
      //   stand: horizontal bar at the bottom
      //   stem: thin vertical line connecting screen to stand
      // Rendered at 30×30 SVG inside a 44×44 holder so the glyph reads
      // clearly alongside the title text (matches Figma visual weight even
      // though we abandoned Figma's clipped 32.5×35 p-13 container math).
      var deviceGlyph = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#efeef2;">' +
        '<rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none"/>' +
        '<path d="M8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>' +
        '<path d="M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>' +
      '</svg>';

      var ACTION_SVGS = {
        'smart-view': '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#fff;"><rect x="3" y="5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M12 9l4 2.5-4 2.5V9z" fill="currentColor"/></svg>',
        'remote':     '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#fff;"><rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="7" r="1.3" fill="currentColor"/><path d="M9 11h6M9 14h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>',
        'power':      '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#222;"><path d="M12 4v8M6.5 7a7 7 0 1 0 11 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>',
        'refresh':    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#fff;"><path d="M4 12a8 8 0 0 1 14-5l2-2M20 7v4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>',
        'play':       '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#fff;"><path d="M8 5l10 7-10 7V5z" fill="currentColor"/></svg>',
        'add':        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color:#fff;"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>'
      };
      var actionsHtml = stmActions.map(function (key, i) {
        var active = i === stmActiveIdx;
        var bg = active ? '#d5d5d5' : 'rgba(180,180,180,0.2)';
        var glyph = ACTION_SVGS[key] || ACTION_SVGS['add'];
        // When active, swap stroke to dark so the glyph is visible on #d5d5d5
        if (active) glyph = glyph.replace("color:#fff", "color:#222");
        return '<div data-toggle-chip data-on="' + (active ? '1' : '0') + '" ' +
          'style="width:51.67px;height:51.67px;aspect-ratio:1;border-radius:63.636px;' +
            'background:' + bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + glyph + '</div>';
      }).join('');

      return '<div style="width:415px;height:88px;max-height:88px;' +
        'background:rgba(23,23,26,0.6);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:var(--card-radius,' + _R('widget') + ');padding:24px 17px 24px 20px;gap:20px;box-sizing:border-box;' +
        'display:flex;align-items:center;overflow:hidden;color:#fff;font-family:var(--font);">' +
        // Left: icon + title/sub
        '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:10px;">' +
          '<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + deviceGlyph + '</div>' +
          '<div style="display:flex;flex-direction:column;min-width:0;">' +
            '<div style="font-size:16px;font-weight:700;color:#efeef2;line-height:1.2;width:138px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + stmTitle + '</div>' +
            (stmShowSub ? '<div style="font-size:14px;font-weight:500;color:#cfcccf;line-height:1.3;width:138px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + stmSub + '</div>' : '') +
          '</div>' +
        '</div>' +
        // Right: action circles
        '<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;">' + actionsHtml + '</div>' +
      '</div>';
    }

    case 'control-pill': {
      // QS control row: left circular icon + 2-line text + optional right
      // icon. Used for "SmartThings / Device control" and stand-alone
      // "Modes" row in the three QS states. variant keys:
      //   icon: 'smartthings'|'modes'|'wifi' — left circle glyph
      //   title, sub: two text lines
      //   rightIcon: 'refresh'|'chevron'|null — right-side accessory
      var cpv = (comp && comp.variant) || {};
      var cpIcon = cpv.icon || 'smartthings';
      var cpTitle = cpv.title || 'SmartThings';
      var cpSub   = cpv.sub || '';
      var cpRight = cpv.rightIcon || null;
      var LEFT_SVGS = {
        'smartthings':'<circle cx="12" cy="12" r="2.2" fill="#222"/><circle cx="12" cy="5" r="1.6" fill="#222"/><circle cx="12" cy="19" r="1.6" fill="#222"/><circle cx="5" cy="12" r="1.6" fill="#222"/><circle cx="19" cy="12" r="1.6" fill="#222"/><path d="M12 7.5v3M12 13.5v3M7 12h3M14 12h3" stroke="#222" strokeWidth="1.4" strokeLinecap="round"/>',
        'modes':      '<circle cx="12" cy="12" r="7.5" stroke="#222" strokeWidth="1.6"/><path d="M12 5v7l5 2.5" stroke="#222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>',
        'wifi':       '<path d="M5 10a12 12 0 0 1 14 0M7 13.5a8 8 0 0 1 10 0M9 17a4 4 0 0 1 6 0" stroke="#222" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="20" r="1.4" fill="#222"/>'
      };
      var RIGHT_SVGS = {
        'refresh':  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0 1 14-5l2-2M20 7v4h-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>',
        'chevron':  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>'
      };
      var leftSvg = LEFT_SVGS[cpIcon] || LEFT_SVGS['smartthings'];
      var rightBlock = '';
      if (cpRight && RIGHT_SVGS[cpRight]) {
        rightBlock = '<div style="width:44px;height:44px;border-radius:50%;background:rgba(180,180,180,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:8px;">' + RIGHT_SVGS[cpRight] + '</div>';
      }
      return '<div style="width:100%;height:100%;min-height:64px;background:rgba(120,120,125,0.28);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-radius:' + _R('widget') + ';padding:10px 14px 10px 10px;box-sizing:border-box;display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--font);">' +
        '<div style="width:44px;height:44px;border-radius:50%;background:#d5d5d5;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' + leftSvg + '</svg>' +
        '</div>' +
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;overflow:hidden;">' +
          '<div style="font-size:14px;font-weight:700;line-height:1.2;">' + cpTitle + '</div>' +
          (cpSub ? '<div style="font-size:var(--font-size-xs,14px);line-height:1.3;opacity:0.75;">' + cpSub + '</div>' : '') +
        '</div>' +
        rightBlock +
      '</div>';
    }

    case 'media-output-row': {
      // "♪ Play music                     Media output"  label row
      // used in QS compact/minimal above the Smart View / Song Search tiles.
      var mor = (comp && comp.variant) || {};
      var morL = mor.left  || 'Play music';
      var morR = mor.right || 'Media output';
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 16px;box-sizing:border-box;color:#fff;font-family:var(--font);font-size:var(--font-size-sm,16px);">' +
        '<div style="display:flex;align-items:center;gap:8px;"><span style="opacity:0.85;">\u266B</span><span>' + morL + '</span></div>' +
        '<div style="opacity:0.85;">' + morR + '</div>' +
      '</div>';
    }

    case 'qs-action-tile': {
      // Pill tile used for "Smart View / Mirror screen" and "Song Search"
      // at the bottom of QS. Left circular icon badge + 2-line text.
      var qat = (comp && comp.variant) || {};
      var qatIcon = qat.icon || 'smart-view';
      var qatTitle = qat.title || 'Smart View';
      var qatSub   = qat.sub || 'Mirror screen';
      var ICON_SVGS = {
        'smart-view':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="12" rx="1.5" stroke="#222" strokeWidth="1.6"/><path d="M12 9l4 2.5-4 2.5V9z" fill="#222"/></svg>',
        'song-search':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 17V6l10-2v11" stroke="#222" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="17" r="2.4" stroke="#222" strokeWidth="1.6"/><circle cx="17" cy="15" r="2.4" stroke="#222" strokeWidth="1.6"/></svg>'
      };
      var qatSvg = ICON_SVGS[qatIcon] || ICON_SVGS['smart-view'];
      return '<div style="width:100%;height:100%;min-height:56px;background:rgba(120,120,125,0.28);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-radius:' + _R('widget') + ';padding:8px 14px 8px 8px;box-sizing:border-box;display:flex;align-items:center;gap:10px;color:#fff;font-family:var(--font);">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:#d5d5d5;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' + qatSvg + '</div>' +
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;overflow:hidden;">' +
          '<div style="font-size:var(--font-size-sm,16px);font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + qatTitle + '</div>' +
          '<div style="font-size:var(--font-size-xs,14px);line-height:1.3;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + qatSub + '</div>' +
        '</div>' +
      '</div>';
    }

    case 'app-dock': {
      // Samsung Home dock — real PNG app icons, label-less.
      var dc = (comp && comp.content) || {};
      var defaultApps = ['Phone', 'Messages', 'Internet', 'Camera'];
      var apps = Array.isArray(dc.apps) ? dc.apps : defaultApps;

      function dockIconHTML(appName) {
        // Map label → filename in /app-icons/. Falls back to a glyph tile.
        var map = {
          'Phone':'Phone.png', 'Messages':'Messages.png', 'Internet':'Internet.png',
          'Camera':'Camera.png', 'Gallery':'Gallery.png', 'Contacts':'Contacts.png',
          'Settings':'Settings.png', 'Clock':'Clock.png', 'Weather':'Weather.png',
          'Calculator':'Calculator.png', 'Calendar':'Clock.png', 'Notes':'Notes.png',
          'Cloud':'Cloud.png', 'Health':'Health.png', 'Reminder':'Reminder.png',
          'Store':'Store.png', 'SmartThings':'SmartThings.png'
        };
        var file = map[appName] || null;
        if (file) {
          return '<img src="app-icons/' + file + '" style="width:56px;height:56px;border-radius:' + _R('widget') + ';object-fit:cover;flex-shrink:0;">';
        }
        var glyph = (appName || '·').charAt(0).toUpperCase();
        return '<div style="width:56px;height:56px;border-radius:' + _R('widget') + ';background:var(--accent-primary,#4285F4);display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;' +
          _T('heading', { weight: 'bold' }) + '">' + glyph + '</div>';
      }

      var iconsHTML = apps.slice(0, 5).map(dockIconHTML).join('');
      return '<div style="width:100%;height:100%;border-radius:var(--card-radius,' + _R('widget') + ');' +
        _G('widgetPill') +
        'display:flex;align-items:center;justify-content:space-around;padding:0 12px;box-sizing:border-box;">' +
        iconsHTML +
      '</div>';
    }

    case 'bottom-bar': {
      var bbc = (comp && comp.content) || {};
      var actions = Array.isArray(bbc.actions) ? bbc.actions : [{ label: 'Back' }, { label: 'Save' }, { label: 'Share' }];

      function barIconFor(label) {
        var lc = (label || '').toLowerCase();
        var c = 'currentColor';
        var s = 'width="16" height="16" viewBox="0 0 24 24" fill="none"';
        if (/back|cancel|close/.test(lc)) return '<svg ' + s + '><path d="M15 6l-6 6 6 6" stroke="' + c + '" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>';
        if (/save|bookmark/.test(lc))      return '<svg ' + s + '><path d="M6 4h12v16l-6-4-6 4V4z" stroke="' + c + '" strokeWidth="1.7" strokeLinejoin="round"/></svg>';
        if (/share/.test(lc))              return '<svg ' + s + '><circle cx="18" cy="6" r="2" stroke="' + c + '" strokeWidth="1.7"/><circle cx="6" cy="12" r="2" stroke="' + c + '" strokeWidth="1.7"/><circle cx="18" cy="18" r="2" stroke="' + c + '" strokeWidth="1.7"/><path d="M8 11l8-4M8 13l8 4" stroke="' + c + '" strokeWidth="1.5"/></svg>';
        if (/done|confirm|ok|check/.test(lc))  return '<svg ' + s + '><path d="M5 12l5 5 9-11" stroke="' + c + '" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>';
        if (/delete|trash|remove/.test(lc))    return '<svg ' + s + '><path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14" stroke="' + c + '" strokeWidth="1.6" strokeLinejoin="round"/></svg>';
        if (/edit|pencil/.test(lc))           return '<svg ' + s + '><path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" stroke="' + c + '" strokeWidth="1.6" strokeLinejoin="round"/></svg>';
        if (/cart|buy|order/.test(lc))        return '<svg ' + s + '><path d="M4 5h2l2 12h11l2-8H7" stroke="' + c + '" strokeWidth="1.7" strokeLinejoin="round"/></svg>';
        if (/like|heart|favor/.test(lc))      return '<svg ' + s + '><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" stroke="' + c + '" strokeWidth="1.7" strokeLinejoin="round"/></svg>';
        return '';
      }

      var actHTML = actions.slice(0, 4).map(function (a) {
        var lbl = (a && (a.label || a.text)) || '';
        var icon = barIconFor(lbl);
        return '<div style="display:flex;align-items:center;gap:6px;color:#fff;">' +
          (icon ? '<span style="display:flex;align-items:center;line-height:0;">' + icon + '</span>' : '') +
          '<span style="' + _T('label', { weight: 'semibold' }) + '">' + lbl + '</span>' +
        '</div>';
      }).join('');

      return '<div style="width:100%;height:100%;border-radius:var(--card-radius,' + _R('widget') + ');' +
        _G('widgetPill') +
        'display:flex;align-items:center;justify-content:space-around;padding:0 14px;box-sizing:border-box;">' +
        actHTML +
      '</div>';
    }

    case 'bottom-dialog':
      // Light surface — typography color override
      return '<div style="width:100%;height:100%;border-radius:' + _R('dialog') + ' ' + _R('dialog') + ' 0 0;background:#f1f1f4;color:#111;padding:' + _S('4xl') + ';box-sizing:border-box;">' +
        '<div style="' + _T('heading', { weight: 'bold', color: '#111' }) + '">Dialog header</div>' +
        '<div style="' + _T('label', { color: '#666' }) + 'margin-top:' + _S('md') + ';">Dialog description</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:24px;' + _T('body', { color: '#111' }) + '"><span>Action 1</span><span>Action 2</span></div>' +
      '</div>';

    case 'center-dialog':
      return '<div style="width:100%;height:100%;border-radius:' + _R('dialog') + ';background:#f1f1f4;color:#111;padding:' + _S('4xl') + ';box-sizing:border-box;">' +
        '<div style="' + _T('heading', { weight: 'bold', color: '#111' }) + '">Center dialog</div>' +
        '<div style="' + _T('label', { color: '#666' }) + 'margin-top:' + _S('md') + ';">Blocking or loading state</div>' +
      '</div>';

    case 'lock-time':
      // hero size, clock family (SamsungNrDefault-V6), bold
      return '<div style="width:100%;height:100%;display:flex;align-items:flex-start;' +
        _T('hero', { family: 'clock', weight: 'bold' }) +
      '">12:45</div>';

    case 'lock-date':
      return '<div style="width:100%;height:100%;display:flex;align-items:center;' +
        _T('heading', { color: 'translucentLabel' }) +
      '">Tue, Apr 20</div>';

    case 'lock-shortcuts':
      // shortcutCircle glass tier; radius via circle token
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="width:48px;height:48px;border-radius:50%;' + _G('shortcutCircle') + '"></div>' +
        '<div style="width:48px;height:48px;border-radius:50%;' + _G('shortcutCircle') + '"></div>' +
      '</div>';

    case 'quick-settings-panel':
      return A.QSScreen
        ? A.QSScreen()
        : '<div style="width:100%;height:100%;border-radius:' + _R('panel') + ' ' + _R('panel') + ' 0 0;' + _G('panel') + '"></div>';

    case 'background':
      return A.Background ? A.Background() : '';

    case 'scrim':
      return '<div style="width:100%;height:100%;background:rgba(0,0,0,0.42);"></div>';

    default:
      return '<div style="width:100%;height:100%;border-radius:' + _R('widget') + ';background:rgba(255,255,255,0.08);"></div>';
  }
};

window.renderSurfacePlan = function renderSurfacePlan(canvas, plan, layout) {
  canvas.innerHTML = '';
  canvas.dataset.rulesMode = '1';
  canvas.style.position = 'relative';
  canvas.style.display = 'block';
  canvas.style.width = layout.viewport.width + 'px';
  canvas.style.height = layout.viewport.height + 'px';
  canvas.style.padding = '0';
  canvas.style.gap = '0';
  canvas.style.overflow = 'hidden';

  for (const comp of plan.components) {
    const rect = window.resolveComponentRect(comp, layout, plan);
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-item surface-item';
    wrapper.id = comp.id;
    wrapper.dataset.role = comp.role;
    wrapper.setAttribute('data-role', comp.role);
    wrapper.dataset.nodeId = comp.id;

    wrapper.style.position = 'absolute';
    wrapper.style.left = rect.x + 'px';
    wrapper.style.top = rect.y + 'px';
    wrapper.style.width = rect.w + 'px';
    wrapper.style.height = rect.h + 'px';

    if (comp.role === 'background' || comp.role === 'scrim') {
      wrapper.style.pointerEvents = 'none';
    }

    // R2: information-priority "defer" components carry
    // visibility="collapsed" — they render but dimmed, non-interactive,
    // and slightly scaled so the user can tell at a glance this is
    // context (not a primary action). Full hide would lose continuity.
    if (comp.visibility === 'collapsed') {
      wrapper.classList.add('priority-collapsed');
    } else if (comp.visibility === 'hidden') {
      wrapper.style.display = 'none';
    }

    // R3-B: emphasis classes driven by the purpose-aware layout
    // dispatcher (_layoutForPurpose). Renderer just reflects the
    // decision — no further reasoning here.
    //   hero      : central dominant element of the purpose layout
    //   must      : matches informationPriority.must_show (subtle glow)
    //   action    : pinned action-row at bottom of continuity/modal
    //   secondary : above-dialog context / supporting info
    //   dim       : dimmed supporting items in hero_single
    if (comp._emphasis) {
      wrapper.classList.add('emphasis-' + comp._emphasis);
    }

    wrapper.innerHTML = window.renderAtomicForRole(comp, rect);

    // Expanded children (list-item, focus-block cells, paragraphs, etc.)
    // get drag-drop reorder handlers. Identified by presence of `_rect`
    // (pre-computed during container expansion).
    if (comp._rect && window.attachReorderHandlers) {
      window.attachReorderHandlers(wrapper, comp.id);
    }

    canvas.appendChild(wrapper);
  }
};

// ============================================================================
// Drag-drop reorder for grouped children (list-items, widget cells, paragraphs,
// notif cards, palette-added items in the same column).
// ============================================================================
window.attachReorderHandlers = function attachReorderHandlers(el, nodeId) {
  if (!el || el.dataset.reorderBound === '1') return;
  el.dataset.reorderBound = '1';
  el.setAttribute('draggable', 'true');

  el.addEventListener('dragstart', function (e) {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
    // Suppress hover overlay during drag
    if (typeof window.setHoveredNode === 'function') window.setHoveredNode(null);
  });

  el.addEventListener('dragend', function () {
    el.classList.remove('dragging');
    document.querySelectorAll('.drag-insert-before, .drag-insert-after')
      .forEach(function (n) { n.classList.remove('drag-insert-before', 'drag-insert-after'); });
  });

  el.addEventListener('dragover', function (e) {
    // Only accept drops from other draggable same-column items
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    var rect = el.getBoundingClientRect();
    var mid = rect.top + rect.height / 2;
    el.classList.remove('drag-insert-before', 'drag-insert-after');
    if (e.clientY < mid) el.classList.add('drag-insert-before');
    else el.classList.add('drag-insert-after');
  });

  el.addEventListener('dragleave', function () {
    el.classList.remove('drag-insert-before', 'drag-insert-after');
  });

  el.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove('drag-insert-before', 'drag-insert-after');
    var sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === nodeId) return;
    if (window.DesignDoc && typeof window.DesignDoc.reorderInColumn === 'function') {
      window.DesignDoc.reorderInColumn(sourceId, nodeId);
    }
  });
};

// Render the given surface type into #canvas.
// Fires EXACTLY ONE DesignDoc subscribe event ('hydrate') at the end.
// Callers (scene buttons, agent fallback, skeleton loader) rely on this
// single-event contract so scene-inspector + interaction-overlay don't
// double-refresh.
window.generateSurfaceScenario = function generateSurfaceScenario(surfaceType) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const viewport = { width: 451, height: 978 };
  const layout = window.createOneUILayout(viewport, surfaceType);
  const plan = window.composeSurfacePlan(surfaceType, layout);
  // Expand compositional roles into individual editable nodes.
  window.expandContainerComponents(plan, layout);
  window.renderSurfacePlan(canvas, plan, layout);

  // Single hydrate — emits one 'hydrate' event to subscribers.
  if (window.DesignDoc && typeof window.DesignDoc.hydrateFromPlan === 'function') {
    window.DesignDoc.hydrateFromPlan(plan, surfaceType);
  }
};

// ============================================================================
// Expandable app bar — 2-state snap logic (expanded / collapsed only)
// Per One UI guide: no resting mid-state. Threshold-based snap on scroll.
// ============================================================================

window.setExpandableAppBarState = function setExpandableAppBarState(el, state) {
  if (!el) return;
  const isExpanded = state === 'expanded';

  el.dataset.appBarState = isExpanded ? 'expanded' : 'collapsed';

  const title = el.querySelector('[data-appbar-title]') || el.firstElementChild;
  if (title) {
    title.style.transition = 'font-size 220ms cubic-bezier(0.2,0,0,1), transform 220ms cubic-bezier(0.2,0,0,1), opacity 220ms cubic-bezier(0.2,0,0,1)';
  }

  el.style.transition = 'height 220ms cubic-bezier(0.2,0,0,1), top 220ms cubic-bezier(0.2,0,0,1)';
  el.style.height = isExpanded ? '215px' : '56px';

  if (title) {
    title.style.fontSize = isExpanded ? '32px' : '20px';
    title.style.transform = isExpanded ? 'translateY(0)' : 'translateY(-2px)';
  }
};

window.enableExpandableAppBarSnap = function enableExpandableAppBarSnap(canvas, surfaceType) {
  if (!canvas) return;
  if (
    surfaceType !== (window.SURFACE_TYPES?.FIRST_DEPTH_LIST || 'first-depth-list') &&
    surfaceType !== (window.SURFACE_TYPES?.SECOND_DEPTH_DETAIL || 'second-depth-detail')
  ) return;

  const appBar = canvas.querySelector('[data-role="expandable-app-bar"], .canvas-item[data-role="expandable-app-bar"]');
  const scrollBody =
    canvas.querySelector('[data-role="list"]') ||
    canvas.querySelector('[data-role="detail-content"]') ||
    canvas.querySelector('.canvas-item[data-role="list"]') ||
    canvas.querySelector('.canvas-item[data-role="detail-content"]');

  if (!appBar || !scrollBody) return;
  if (appBar.dataset.snapBound === '1') return;

  appBar.dataset.snapBound = '1';
  appBar.dataset.appBarState = appBar.dataset.appBarState || 'expanded';

  scrollBody.style.overflowY = 'auto';
  scrollBody.style.webkitOverflowScrolling = 'touch';

  let ticking = false;
  let lastScrollTop = 0;

  function applySnap() {
    ticking = false;
    const st = scrollBody.scrollTop;
    const threshold = 48;

    if (st <= 0) {
      window.setExpandableAppBarState(appBar, 'expanded');
      lastScrollTop = st;
      return;
    }

    if (st > threshold) {
      window.setExpandableAppBarState(appBar, 'collapsed');
    } else {
      window.setExpandableAppBarState(appBar, 'expanded');
    }

    lastScrollTop = st;
  }

  scrollBody.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(applySnap);
    }
  });

  scrollBody.addEventListener('touchend', () => {
    applySnap();
  });

  scrollBody.addEventListener('mouseup', () => {
    applySnap();
  });
};

// ============================================================================
//  Interact-mode delegated handlers for surface atomics
//  ---------------------------------------------------------------------------
//  Atomics (toggle-chip, slider-pill, etc.) are rendered as innerHTML strings,
//  which means per-element onclick can't easily survive re-renders from
//  composeSurfacePlan. Instead we delegate from document:
//    - Clicks only take effect when body.cmd-interact-mode is set
//    - We stopPropagation so the canvas click handler doesn't run selection
//  The handler is idempotent — bind once.
// ============================================================================
(function () {
  if (window._atomicInteractBound) return;
  window._atomicInteractBound = true;

  function _inInteractMode(e) {
    return !!(e && (e.metaKey || e.ctrlKey)) ||
           document.body.classList.contains('cmd-interact-mode');
  }

  // --- Toggle chip: click anywhere on the 56×56 circle flips on/off --------
  document.addEventListener('click', function (e) {
    if (!_inInteractMode(e)) return;
    var chip = e.target.closest('[data-toggle-chip]');
    if (!chip) return;
    e.stopPropagation();
    var on = chip.getAttribute('data-on') === '1';
    var next = !on;
    chip.setAttribute('data-on', next ? '1' : '0');
    chip.style.background = next ? '#d5d5d5' : 'rgba(180,180,180,0.2)';
    var onEl = chip.querySelector('[data-toggle-on]');
    var offEl = chip.querySelector('[data-toggle-off]');
    if (onEl) onEl.style.display = next ? 'inline-flex' : 'none';
    if (offEl) offEl.style.display = next ? 'none' : 'inline-flex';
  }, true);

  // --- Shortcut / navigation press animation -------------------------------
  // `[data-shortcut]` marks single-toggle kind='shortcut' and any other
  // Figma atomics that represent a navigation action (open another screen).
  // No state changes — just a quick press-ripple so the click feels real.
  document.addEventListener('click', function (e) {
    if (!_inInteractMode(e)) return;
    var btn = e.target.closest('[data-shortcut]');
    if (!btn) return;
    e.stopPropagation();
    btn.style.transform = 'scale(0.96)';
    btn.style.background = 'rgba(23,23,26,0.5)';
    setTimeout(function () {
      btn.style.transform = '';
      btn.style.background = '';
    }, 140);
  }, true);

  // --- Slider pill: pointer-drag updates fill in %. Works for both
  // horizontal and vertical orientations (data-orient="vertical").
  // Vertical fill grows bottom→top, so we invert the Y axis.
  var _drag = null;
  function _setPctFromPoint(pill, clientX, clientY) {
    var rect = pill.getBoundingClientRect();
    var vertical = pill.getAttribute('data-orient') === 'vertical';
    var raw;
    if (vertical) {
      // Invert: pointer near top = 100%, near bottom = 0%
      raw = 1 - (clientY - rect.top) / Math.max(1, rect.height);
    } else {
      raw = (clientX - rect.left) / Math.max(1, rect.width);
    }
    var pct = Math.round(Math.max(0, Math.min(1, raw)) * 100);
    pill.setAttribute('data-pct', String(pct));
    var fill = pill.querySelector('[data-slider-fill]');
    if (!fill) return;
    if (vertical) fill.style.height = pct + '%';
    else          fill.style.width  = pct + '%';
  }
  document.addEventListener('pointerdown', function (e) {
    if (!_inInteractMode(e)) return;
    var pill = e.target.closest('[data-slider-pill]');
    if (!pill) return;
    e.stopPropagation();
    e.preventDefault();
    _drag = pill;
    try { pill.setPointerCapture(e.pointerId); } catch (_) {}
    _setPctFromPoint(pill, e.clientX, e.clientY);
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!_drag) return;
    _setPctFromPoint(_drag, e.clientX, e.clientY);
  }, true);
  document.addEventListener('pointerup', function () { _drag = null; }, true);
  document.addEventListener('pointercancel', function () { _drag = null; }, true);
})();
