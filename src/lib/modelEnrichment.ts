/**
 * Utility functions for enriching models with intelligence categories
 */

import { Model } from '../types';
import { modelNameToCategories, modelNameToDescription, modelDescriptions } from '../data/modelCategories';

/**
 * Enrich a model with its intelligence categories based on its name/ID
 */
export function enrichModelWithCategories(model: Model): Model {
  // Try to match by full name first
  let categories = modelNameToCategories.get(model.name);
  let description = modelNameToDescription.get(model.name);
  
  // Try exact match on model ID
  if (!categories) {
    categories = modelNameToCategories.get(model.id);
    description = modelNameToDescription.get(model.id);
  }
  
  // Try to find a match by searching through the model descriptions
  if (!categories) {
    for (const desc of modelDescriptions) {
      // Check if the model name or ID contains the description model name  or vice versa
      const nameLower = model.name.toLowerCase();
      const idLower = model.id.toLowerCase();
      const descLower = desc.model.toLowerCase();
      
      if (
        nameLower.includes(descLower) ||
        descLower.includes(nameLower) ||
        idLower.includes(descLower) ||
        descLower.includes(idLower)
      ) {
        categories = desc.categories;
        description = desc.description;
        break;
      }
    }
  }
  
  const enriched = { ...model };
  
  if (categories && categories.length > 0) {
    enriched.intelligenceCategories = Array.from(categories);
  }
  
  if (description) {
    enriched.copilotDescription = description;
  }
  
  return enriched;
}

/**
 * Enrich all models with their intelligence categories
 */
export function enrichModelsWithCategories(models: Model[]): Model[] {
  return models.map(enrichModelWithCategories);
}
