export type ConstructionStage = 
  | 'Excavation/Foundation' 
  | 'Framing/Structural' 
  | 'Enclosure/Roofing' 
  | 'Interior/Finishing'
  | 'Unknown';

export interface ConstructionPhoto {
  id: string;
  url: string;
  stage: ConstructionStage;
  insight: string;
  timestamp: number;
  fileName: string;
}

export const STAGES: ConstructionStage[] = [
  'Excavation/Foundation',
  'Framing/Structural',
  'Enclosure/Roofing',
  'Interior/Finishing'
];
