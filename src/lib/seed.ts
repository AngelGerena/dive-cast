import type { Site } from './types';

// Offline fallback for the site directory, used only if Supabase cannot be reached.
// The live list comes from the sites table. Verify coordinates, depths and station IDs before launch.

export const SITES: Site[] = [
  {
    id: 's-bhb', slug: 'blue-heron-bridge', name: 'Blue Heron Bridge', kind: 'shore', access: 'shore',
    area: 'Riviera Beach', lat: 26.7836, lng: -80.0425, maxDepthFt: 25, minCert: 'Open Water',
    summary: 'A shallow shore dive under the bridge at Phil Foster Park, known for macro life. Best around high slack tide.',
    waterSource: { type: 'coops', station: '8722670', label: 'Lake Worth Pier station' },
    tideStation: { id: '8722670', label: 'Lake Worth Pier' }, isDemo: true
  },
  {
    id: 's-peanut', slug: 'peanut-island', name: 'Peanut Island', kind: 'shore', access: 'shore',
    area: 'Riviera Beach', lat: 26.7717, lng: -80.0453, maxDepthFt: 15, minCert: 'Open Water',
    summary: 'Calm, clear water along the island rock line. Popular for snorkeling and easy training dives.',
    waterSource: { type: 'coops', station: '8722670', label: 'Lake Worth Pier station' },
    tideStation: { id: '8722670', label: 'Lake Worth Pier' }, isDemo: true
  },
  {
    id: 's-breakers', slug: 'breakers-reef', name: 'Breakers Reef', kind: 'drift', access: 'boat',
    area: 'Palm Beach', lat: 26.7205, lng: -80.0255, maxDepthFt: 70, minDepthFt: 50, minCert: 'Advanced Open Water',
    summary: 'A boat drift dive along a reef line off Palm Beach, often with turtles and a steady Gulf Stream push.',
    waterSource: { type: 'model' }, tideStation: { id: '8722670', label: 'Lake Worth Pier' }, isDemo: true
  },
  {
    id: 's-devils-den', slug: 'devils-den', name: "Devil's Den", kind: 'spring', access: 'shore',
    area: 'Williston', lat: 29.4087, lng: -82.4764, maxDepthFt: 54, minCert: 'Open Water',
    summary: 'A prehistoric spring inside a dry cave, lit by a single opening in the roof.',
    waterSource: { type: 'spring', tempF: 72 }, isDemo: true
  },
  {
    id: 's-blue-grotto', slug: 'blue-grotto', name: 'Blue Grotto', kind: 'spring', access: 'shore',
    area: 'Williston', lat: 29.3747, lng: -82.4815, maxDepthFt: 100, minCert: 'Open Water',
    summary: 'A clear-water spring and cavern with a stationary air bell at 30 ft.',
    waterSource: { type: 'spring', tempF: 72 }, isDemo: true
  },
  {
    id: 's-ginnie', slug: 'ginnie-springs', name: 'Ginnie Springs', kind: 'spring', access: 'shore',
    area: 'High Springs', lat: 29.8363, lng: -82.7002, maxDepthFt: 50, minCert: 'Open Water',
    summary: 'Crystal springs on the Santa Fe River, including the Ballroom and the Devil\u2019s Eye system.',
    waterSource: { type: 'spring', tempF: 72 },
    usgsGauge: { id: '02322500', label: 'Santa Fe River near Fort White' }, isDemo: true
  },
  {
    id: 's-rainbow', slug: 'rainbow-river', name: 'Rainbow River', kind: 'drift', access: 'shore',
    area: 'Dunnellon', lat: 29.1020, lng: -82.4370, maxDepthFt: 25, minCert: 'Open Water',
    summary: 'A slow, spring-fed river drift over eelgrass and limestone vents.',
    waterSource: { type: 'spring', tempF: 72 }, isDemo: true
  },
  {
    id: 's-spiegel', slug: 'spiegel-grove', name: 'Spiegel Grove', kind: 'wreck', access: 'boat',
    area: 'Key Largo', lat: 25.0662, lng: -80.3107, maxDepthFt: 130, minDepthFt: 60, minCert: 'Advanced Open Water',
    summary: 'A 510 ft former Navy ship sunk as an artificial reef in 2002. Wreck training is recommended.',
    waterSource: { type: 'model' }, isDemo: true
  },
  {
    id: 's-molasses', slug: 'molasses-reef', name: 'Molasses Reef', kind: 'reef', access: 'boat',
    area: 'Key Largo', lat: 25.0103, lng: -80.3747, maxDepthFt: 40, minCert: 'Open Water',
    summary: 'A classic Keys spur-and-groove reef with shallow coral and plenty of reef fish.',
    waterSource: { type: 'model' }, isDemo: true
  }
];
