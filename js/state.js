/**
 * state.js
 * -------------------------------------------------------------------------
 * Central application state, event bus, and helpers for mutation.
 * Uses a lightweight publish/subscribe pattern with one shared observable
 * store instead of a heavyweight framework.
 * -------------------------------------------------------------------------
 */

import { deepClone, uid } from './utils.js';

/** Ordered list of built-in resume sections. */
export const BUILT_IN_SECTIONS = [
  { id: 'personal', label: 'Personal', icon: 'user' },
  { id: 'summary', label: 'Summary', icon: 'note' },
  { id: 'experience', label: 'Experience', icon: 'briefcase' },
  { id: 'education', label: 'Education', icon: 'cap' },
  { id: 'projects', label: 'Projects', icon: 'code' },
  { id: 'skills', label: 'Skills', icon: 'sparkle' },
  { id: 'certifications', label: 'Certifications', icon: 'badge' },
  { id: 'languages', label: 'Languages', icon: 'globe' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy' },
  { id: 'interests', label: 'Interests', icon: 'heart' }
];

/** Character limits used by the UI (soft warnings only). */
export const CHAR_LIMITS = {
  summary: 600,
  experienceDesc: 800,
  projectDesc: 500,
  educationDesc: 300,
  custom: 800
};

/**
 * Creates the initial application state shown to first-time users.
 */
export function createDefaultState() {
  return {
    meta: {
      template: 'template1',
      font: "'Inter', system-ui, sans-serif",
      zoom: 1,
      activeSection: 'personal',
      sectionOrder: [
        'summary',
        'experience',
        'education',
        'projects',
        'skills',
        'certifications',
        'languages',
        'achievements',
        'interests'
      ],
      hiddenSections: []
    },

    personal: {
      name: 'Alex Morgan',
      title: 'Senior Product Designer',
      email: 'alex.morgan@example.com',
      phone: '+1 (415) 555-0128',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/alexmorgan',
      github: 'github.com/alexmorgan',
      portfolio: 'alexmorgan.design',
      photo: ''
    },

    summary: {
      text:
        'Product designer with 8+ years crafting delightful interfaces for high-growth SaaS. I turn ambiguous problems into elegant, measurable products that customers love and teams can build.'
    },

    experience: [
      {
        id: uid('exp'),
        company: 'Northwind Labs',
        role: 'Senior Product Designer',
        location: 'Remote',
        start: '2022-03',
        end: '',
        current: true,
        description:
          'Led redesign of core analytics workspace, lifting daily active use by 34%.\n' +
          'Built a shared design system adopted by 6 product squads.\n' +
          'Mentored 3 mid-level designers into staff-track career paths.'
      },
      {
        id: uid('exp'),
        company: 'Halcyon Tech',
        role: 'Product Designer',
        location: 'New York, NY',
        start: '2019-06',
        end: '2022-02',
        current: false,
        description:
          'Shipped onboarding flow that improved activation by 22%.\n' +
          'Owned end-to-end design for the mobile app on iOS + Android.'
      }
    ],

    education: [
      {
        id: uid('edu'),
        school: 'University of California, Berkeley',
        degree: 'B.S. Human-Computer Interaction',
        location: 'Berkeley, CA',
        start: '2013-09',
        end: '2017-05',
        description: 'Honors thesis on cognitive load in dashboards.'
      }
    ],

    projects: [
      {
        id: uid('prj'),
        name: 'Motif — a keyboard-first task manager',
        stack: 'React, TypeScript, IndexedDB',
        github: 'github.com/alexmorgan/motif',
        demo: 'motif.app',
        description:
          'A minimalist, offline-first task manager designed around keyboard shortcuts and rapid capture.'
      }
    ],

    skills: [
      {
        id: uid('cat'),
        name: 'Design',
        tags: [
          'Figma',
          'Prototyping',
          'Design Systems',
          'Accessibility'
        ]
      },
      {
        id: uid('cat'),
        name: 'Research',
        tags: [
          'User Interviews',
          'Usability Testing',
          'Analytics'
        ]
      },
      {
        id: uid('cat'),
        name: 'Collaboration',
        tags: [
          'Cross-functional Leadership',
          'Mentoring',
          'Workshops'
        ]
      }
    ],

    certifications: [
      {
        id: uid('cert'),
        name: 'Nielsen Norman UX Master',
        issuer: 'NN/g',
        date: '2021-08'
      }
    ],

    languages: [
      {
        id: uid('lng'),
        name: 'English',
        level: 'Native'
      },
      {
        id: uid('lng'),
        name: 'Spanish',
        level: 'Professional'
      }
    ],

    achievements: [
      {
        id: uid('ach'),
        text: 'Speaker at Config 2024 — "Design systems at scale"'
      }
    ],

    interests: [
      {
        id: uid('int'),
        text: 'Bouldering'
      },
      {
        id: uid('int'),
        text: 'Analog photography'
      },
      {
        id: uid('int'),
        text: 'Ceramics'
      }
    ],

    customSections: []
  };
}

/**
 * Tiny observable store.
 *
 * Methods:
 * - get() → Returns the current state.
 * - replace(newState) → Replaces the entire state.
 * - update(mutator) → Safely mutates a cloned draft and notifies subscribers.
 * - subscribe(fn) → Registers a state listener.
 * - on(event, fn) → Registers an event listener.
 * - emit(event, payload) → Emits a custom event.
 */
export function createStore(initialState) {
  let state = deepClone(initialState);

  const subscribers = new Set();
  const eventBus = new Map();

  function notify() {
    subscribers.forEach((subscriber) => {
      try {
        subscriber(state);
      } catch (error) {
        console.error('Subscriber Error:', error);
      }
    });
  }

  return {
    get() {
      return state;
    },

    replace(nextState) {
      state = deepClone(nextState);
      notify();
    },

    update(mutator) {
      const draft = deepClone(state);

      mutator(draft);

      state = draft;
      notify();
    },

    subscribe(fn) {
      subscribers.add(fn);

      return () => {
        subscribers.delete(fn);
      };
    },

    on(event, fn) {
      if (!eventBus.has(event)) {
        eventBus.set(event, new Set());
      }

      eventBus.get(event).add(fn);

      return () => {
        eventBus.get(event)?.delete(fn);
      };
    },

    emit(event, payload) {
      eventBus.get(event)?.forEach((fn) => {
        try {
          fn(payload);
        } catch (error) {
          console.error(error);
        }
      });
    }
  };
}