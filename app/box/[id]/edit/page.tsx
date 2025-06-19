'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { getBox, updateBox, Box } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const WAVES = ['Wave 1', 'Wave 2', 'Wave 3', 'Storage'];
const EMOJIS = [
  // Kitchen & Food
  '🍳', '🍽️', '🥘', '🍴', '🧂', '🍷', '🧀', '🍎',
  // Bedroom & Clothing
  '👕', '🛏️', '👗', '👟', '🧥', '🧸', '💄', '🪞',
  // Office & Work
  '💻', '📚', '✏️', '📁', '🖨️', '📱', '🎒', '💼',
  // Bathroom & Personal Care
  '🧴', '🧼', '🪒', '🧻', '🛁',
  // Living Room & Entertainment
  '📺', '🎮', '🎵', '📷', '🎨', '🧩', '🎭', '🎪',
  // Garage & Tools
  '🔧', '🔨', '⚡', '🔋', '🚗', '🚲', '🏃',
  // Storage & Organization
  '📦', '🗂️', '🗄️', '🧺', '🗑️', '📋',
  // Seasonal & Special
  '🎄', '🎃', '🌸', '🏖️', '🍂', '❄️', '🎁', '🎊'
];

export default function EditBox() {
  const params = useParams();
  const router = useRouter();
  const boxId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState<Box | null>(null);

  const [formData, setFormData] = useState({
    boxNumber: 1,
    group: 'Wave 1',
    category: '',
    summary: '',
    colorCode: '📦',
    location: '',
    notes: ''
  });

  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['📦']);

  useEffect(() => {
    loadBox();
  }, [boxId]);

  const loadBox = async () => {
    try {
      const boxData = await getBox(boxId);
      if (boxData) {
        setBox(boxData);
        setFormData({
          boxNumber: boxData.boxNumber,
          group: boxData.group,
          category: boxData.category,
          summary: boxData.summary,
          colorCode: boxData.colorCode,
          location: boxData.location || '',
          notes: boxData.notes || ''
        });

        // Parse emojis from colorCode (handle both single and multiple emojis)
        const emojis = boxData.colorCode ? boxData.colorCode.split(' ').filter(emoji => emoji.trim()) : ['📦'];
        setSelectedEmojis(emojis);
      }
    } catch (error) {
      console.error('Error loading box:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category.trim() || !formData.summary.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      await updateBox(boxId, {
        boxNumber: formData.boxNumber,
        group: formData.group,
        category: formData.category.trim(),
        summary: formData.summary.trim(),
        colorCode: selectedEmojis.join(' '), // Store all emojis
        location: formData.location.trim(),
        notes: formData.notes.trim()
      });

      router.push(`/box/${boxId}`);
    } catch (error) {
      console.error('Error updating box:', error);
      toast.error('Error updating box. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmojiToggle = (emoji: string) => {
    setSelectedEmojis(prev => {
      const newEmojis = prev.includes(emoji)
        ? prev.filter(e => e !== emoji)
        : [...prev, emoji];

      // Update form data with the first emoji (for backward compatibility)
      setFormData(prevForm => ({ ...prevForm, colorCode: newEmojis[0] || '📦' }));

      return newEmojis;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading box...</p>
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Box not found</h2>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/box/${boxId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Box {box.boxNumber}</h1>
            <p className="text-gray-600">Update box information</p>
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
            </div>

            {/* Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group *
              </label>
              <input
                type="text"
                value={formData.group}
                onChange={(e) => handleInputChange('group', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Wave 1, Wave 2, Storage"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Kitchen, Bedroom, Office"
                required
              />
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

            {/* Visual Identifiers (Emojis) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visual Identifiers
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Select one or more emojis to help identify this box. Click to toggle selection.
              </p>
              <div className="grid grid-cols-8 gap-2 mb-2">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiToggle(emoji)}
                    className={`p-2 text-xl rounded-lg border-2 transition-colors ${selectedEmojis.includes(emoji)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={selectedEmojis.join(' ')}
                onChange={(e) => {
                  const emojis = e.target.value.split(' ').filter(emoji => emoji.trim());
                  setSelectedEmojis(emojis);
                  setFormData(prev => ({ ...prev, colorCode: emojis[0] || '📦' }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Or type emojis separated by spaces"
              />
              {selectedEmojis.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {selectedEmojis.join(' ')}
                </p>
              )}
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
                disabled={saving || !formData.category.trim() || !formData.summary.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href={`/box/${boxId}`}>
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