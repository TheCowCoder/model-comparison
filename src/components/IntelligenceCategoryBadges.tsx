import React from 'react';
import { IntelligenceCategory, allCategories } from '../data/modelCategories';
import { Badge, Sparkles } from 'lucide-react';

interface CategoryBadgeProps {
  category: IntelligenceCategory;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display a single intelligence category badge
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const categoryInfo = allCategories.find(c => c.id === category);
  if (!categoryInfo) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const colors = {
    'lightweight-coding': 'bg-blue-100 text-blue-800',
    'architectural-analysis': 'bg-purple-100 text-purple-800',
    'agentic-tasks': 'bg-orange-100 text-orange-800',
    'complex-reasoning': 'bg-red-100 text-red-800',
    'code-generation': 'bg-green-100 text-green-800',
    'fast-responses': 'bg-yellow-100 text-yellow-800',
    'debugging': 'bg-pink-100 text-pink-800',
    'research-workflows': 'bg-indigo-100 text-indigo-800',
    'tool-use': 'bg-cyan-100 text-cyan-800',
    'multimodal': 'bg-fuchsia-100 text-fuchsia-800',
    'reasoning-inference': 'bg-teal-100 text-teal-800',
    'editor-workflows': 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span
      className={`inline-block rounded-full font-medium ${sizeClasses[size]} ${colors[category]} whitespace-nowrap`}
      title={categoryInfo.description}
    >
      {categoryInfo.label}
    </span>
  );
};

interface CategoriesListProps {
  categories?: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDescriptions?: boolean;
}

/**
 * Display a list of intelligence categories
 */
export const CategoriesList: React.FC<CategoriesListProps> = ({
  categories = [],
  size = 'md',
  className = '',
  showDescriptions = false,
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {categories.map((category) => (
        <div key={category}>
          <CategoryBadge category={category as IntelligenceCategory} size={size} />
          {showDescriptions && (
            <div className="text-xs text-gray-600 mt-1">
              {allCategories.find(c => c.id === category)?.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface CategorySelectorProps {
  selectedCategories: Set<string>;
  onToggle: (category: IntelligenceCategory) => void;
  className?: string;
}

/**
 * Component to select/filter by intelligence categories
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onToggle,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" />
        <h3 className="font-semibold text-sm">Intelligence Categories</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {allCategories.map((category) => (
          <label
            key={category.id}
            className="flex items-start gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedCategories.has(category.id)}
              onChange={() => onToggle(category.id as IntelligenceCategory)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{category.label}</div>
              <div className="text-xs text-gray-600">{category.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

interface CategoryInfoProps {
  category: IntelligenceCategory;
}

/**
 * Display detailed information about a category
 */
export const CategoryInfo: React.FC<CategoryInfoProps> = ({ category }) => {
  const categoryInfo = allCategories.find(c => c.id === category);
  if (!categoryInfo) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={category} size="md" />
      </div>
      <p className="text-sm text-gray-700">{categoryInfo.description}</p>
    </div>
  );
};
