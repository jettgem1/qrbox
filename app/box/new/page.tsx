'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { createBox, getAllBoxes, getAllGroups, createGroup, type Group, getAllCategoriesWithPresets, createCategory, Category } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/protected-route';

function NewBox() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nextBoxNumber, setNextBoxNumber] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const [formData, setFormData] = useState({
    boxNumber: 1,
    group: '',
    category: '',
    summary: '',
    colorCode: '📦',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (user && !authLoading) {
      loadNextBoxNumber();
      loadGroups();
      loadCategories();
    }
  }, [user, authLoading]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const fetchedCategories = await getAllCategoriesWithPresets(user.uid);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleCreateCategory = async () => {
    if (!user) return;

    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const newCategory = await createCategory(newCategoryName.trim(), user.uid);
      if (newCategory.id) {
        setCategories(prev => [...prev, newCategory as Category & { id: string }]);
        setFormData(prev => ({ ...prev, category: newCategory.name }));
        setNewCategoryName('');
        setShowNewCategoryInput(false);
        toast.success('Category created successfully');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const loadGroups = async () => {
    if (!user) return;

    try {
      const fetchedGroups = await getAllGroups(user.uid);
      setGroups(fetchedGroups.filter((group): group is Group & { id: string } => group.id !== undefined));
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;

    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const newGroup = await createGroup(newGroupName.trim(), user.uid);
      if (newGroup.id) {
        setGroups(prev => [...prev, newGroup as Group & { id: string }]);
        setFormData(prev => ({ ...prev, group: newGroup.name }));
        setNewGroupName('');
        setShowNewGroupInput(false);
        toast.success('Group created successfully');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const loadNextBoxNumber = async () => {
    if (!user) return;

    try {
      const boxes = await getAllBoxes(user.uid);
      const maxNumber = Math.max(0, ...boxes.map(box => box.boxNumber));
      const nextNumber = maxNumber + 1;
      setNextBoxNumber(nextNumber);
      setFormData(prev => ({ ...prev, boxNumber: nextNumber }));
    } catch (error) {
      console.error('Error loading next box number:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a box');
      return;
    }

    if (!formData.category.trim() || !formData.summary.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      await createBox({
        userId: user.uid,
        boxNumber: formData.boxNumber,
        group: formData.group,
        category: formData.category.trim(),
        summary: formData.summary.trim(),
        colorCode: formData.colorCode,
        location: formData.location.trim(),
        notes: formData.notes.trim()
      });

      router.push('/');
    } catch (error) {
      console.error('Error creating box:', error);
      toast.error('Error creating box. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4">
            <img
              src="/packLog2.png"
              alt="PackLog Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📦</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Create New Box
                </h1>
                <p className="text-gray-600 text-sm">Add a new box to your PackLog inventory</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Box Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Box Number *
              </label>
              <input
                type="number"
                value={formData.boxNumber}
                onChange={(e) => handleInputChange('boxNumber', parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Next available number: {nextBoxNumber}
              </p>
            </div>

            {/* Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group *
              </label>
              <div className="space-y-2">
                {!showNewGroupInput ? (
                  <>
                    <select
                      value={formData.group}
                      onChange={(e) => handleInputChange('group', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a group</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewGroupInput(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Group
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter new group name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateGroup}
                      className="whitespace-nowrap"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewGroupInput(false);
                        setNewGroupName('');
                      }}
                      className="whitespace-nowrap"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="space-y-2">
                {!showNewCategoryInput ? (
                  <>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.name}>
                          {category.name} {category.isPreset ? '(Preset)' : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewCategoryInput(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Category
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      className="whitespace-nowrap"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      className="whitespace-nowrap"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary *
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of what's in this box"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Garage, Parents' attic, Storage unit"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes about this box..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !formData.category.trim() || !formData.summary.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Box'}
              </Button>
              <Link href="/">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NewBoxPage() {
  return (
    <ProtectedRoute>
      <NewBox />
    </ProtectedRoute>
  );
} 