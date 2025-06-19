'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllBoxes, Box, Item } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface MoveItemProps {
  item: Item;
  currentBoxId: string;
  onMove: (targetBoxId: string) => Promise<void>;
  onClose: () => void;
}

export default function MoveItem({ item, currentBoxId, onMove, onClose }: MoveItemProps) {
  const { user, loading: authLoading } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      loadBoxes();
    }
  }, [user, authLoading]);

  useEffect(() => {
    // Filter boxes based on search term
    if (searchTerm.trim()) {
      const filtered = boxes.filter(box =>
        box.boxNumber.toString().includes(searchTerm) ||
        box.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.group.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBoxes(filtered);
    } else {
      setFilteredBoxes(boxes);
    }
  }, [searchTerm, boxes]);

  const loadBoxes = async () => {
    if (!user) return;

    try {
      const boxesData = await getAllBoxes(user.uid);
      // Filter out the current box
      const availableBoxes = boxesData.filter(box => box.id !== currentBoxId);
      setBoxes(availableBoxes);
      setFilteredBoxes(availableBoxes);
    } catch (error) {
      console.error('Error loading boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedBoxId) return;

    setMoving(true);
    try {
      await onMove(selectedBoxId);
      onClose();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Error moving item. Please try again.');
    } finally {
      setMoving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {authLoading ? 'Loading...' : 'Loading boxes...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (boxes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Other Boxes Available</h3>
            <p className="text-gray-600 mb-4">
              You need at least one other box to move items between boxes.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Move Item</h3>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Item Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              {item.photo && (
                <img
                  src={item.photo}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded border"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                {item.category && (
                  <p className="text-sm text-blue-600">{item.category}</p>
                )}
                {item.notes && (
                  <p className="text-sm text-gray-600">{item.notes}</p>
                )}
              </div>
            </div>
          </div>

          {/* Target Box Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move to Box:
            </label>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by box number, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredBoxes.length > 0 ? (
                filteredBoxes.map((box) => (
                  <div
                    key={box.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedBoxId === box.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setSelectedBoxId(box.id!)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{box.colorCode}</span>
                      <div className="flex-1">
                        <div className="font-medium">Box {box.boxNumber}</div>
                        <div className="text-sm text-gray-600">{box.category}</div>
                        <div className="text-xs text-gray-500">{box.summary}</div>
                        <div className="text-xs text-gray-400">{box.group}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm.trim() ? 'No boxes found matching your search.' : 'No boxes available.'}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleMove}
              disabled={!selectedBoxId || moving}
              className="flex-1"
            >
              {moving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Moving...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move Item
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 