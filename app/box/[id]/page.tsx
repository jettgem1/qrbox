'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Edit,
  Plus,
  Download,
  Trash2,
  Save,
  X,
  QrCode,
  Camera,
  ArrowRight
} from 'lucide-react';
import { getBox, getItems, createItem, updateItem, deleteItem, deleteBox, moveItem, Box, Item, updateBox } from '@/lib/firestore';
import { generateBoxUrl, downloadQRCode, getGroupColor, getGroupColorLight } from '@/lib/utils/qr';
import { Button } from '@/components/ui/button';
import PhotoCapture from '@/components/photo-capture';
import MoveItem from '@/components/move-item';
import BoxPhotoUpload from '@/components/box-photo-upload';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface AnalyzedItem {
  name: string;
  description: string;
  category: string;
  photo: string;
}

export default function BoxDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const boxId = params.id as string;
  const showQR = searchParams.get('qr') === 'true';

  const [box, setBox] = useState<Box | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState('');
  const [editingItemCategory, setEditingItemCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showMoveItem, setShowMoveItem] = useState(false);
  const [showBoxPhotoUpload, setShowBoxPhotoUpload] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBoxData();
  }, [boxId]);

  const loadBoxData = async () => {
    try {
      const [boxData, itemsData] = await Promise.all([
        getBox(boxId),
        getItems(boxId)
      ]);
      setBox(boxData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading box data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !user) return;

    try {
      await createItem(boxId, {
        userId: user.uid,
        name: newItemName.trim(),
        notes: newItemNotes.trim() || undefined,
        category: newItemCategory.trim() || undefined
      });
      setNewItemName('');
      setNewItemNotes('');
      setNewItemCategory('');
      setShowAddForm(false);
      loadBoxData();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editingItemName.trim()) return;

    try {
      await updateItem(boxId, itemId, {
        name: editingItemName.trim(),
        notes: editingItemNotes.trim() || undefined,
        category: editingItemCategory.trim() || undefined
      });
      setEditingItem(null);
      setEditingItemName('');
      setEditingItemNotes('');
      setEditingItemCategory('');
      loadBoxData();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteItem(boxId, itemId);
      loadBoxData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDeleteBox = async () => {
    if (!confirm('Are you sure you want to delete this box? This action cannot be undone.')) return;

    try {
      await deleteBox(boxId);
      router.push('/');
    } catch (error) {
      console.error('Error deleting box:', error);
    }
  };

  const handleMoveItem = async (targetBoxId: string) => {
    if (!selectedItem?.id) return;

    try {
      await moveItem(boxId, targetBoxId, selectedItem);
      setSelectedItem(null);
      setShowMoveItem(false);
      loadBoxData();
    } catch (error) {
      console.error('Error moving item:', error);
      throw error;
    }
  };

  const handleDownloadQR = () => {
    if (qrRef.current) {
      downloadQRCode(qrRef.current, `box-${box?.boxNumber}-qr`);
    }
  };

  const handleItemsAnalyzed = async (analyzedItems: AnalyzedItem[]) => {
    if (!user) return;

    try {
      // Add all analyzed items to the box
      for (const item of analyzedItems) {
        await createItem(boxId, {
          userId: user.uid,
          name: item.name,
          notes: item.description,
          category: item.category,
          photo: item.photo
        });
      }

      // Reload the box data to show new items
      loadBoxData();

      // Show success message
      toast.success(`Successfully added ${analyzedItems.length} items to the box!`);
    } catch (error) {
      console.error('Error adding analyzed items:', error);
      toast.error('Error adding items. Please try again.');
    }
  };

  const handleBoxPhotoUploaded = async (photo: string) => {
    try {
      await updateBox(boxId, { photo });
      setBox(prev => prev ? { ...prev, photo } : null);
    } catch (error) {
      console.error('Error updating box photo:', error);
      toast.error('Error updating box photo. Please try again.');
    }
  };

  const startEditing = (item: Item) => {
    if (item.id) {
      setEditingItem(item.id);
      setEditingItemName(item.name);
      setEditingItemNotes(item.notes || '');
      setEditingItemCategory(item.category || '');
    }
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingItemName('');
    setEditingItemNotes('');
    setEditingItemCategory('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-box-600 mx-auto"></div>
          <p className="mt-4 text-box-600">Loading box...</p>
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-box-900 mb-4">Box not found</h2>
          <Link href="/">
            <Button className="bg-box-600 hover:bg-box-700">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (showQR) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-md w-full mx-4">
          <div ref={qrRef} className="bg-white p-4 sm:p-6 rounded-lg border-2 border-box-200">
            {/* Box Header */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl sm:text-3xl">{box.colorCode}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-box-900">Box {box.boxNumber}</h2>
              </div>
              <span
                className="inline-block px-3 py-1 text-sm font-medium rounded-full mb-2"
                style={{
                  backgroundColor: getGroupColorLight(box.group),
                  color: getGroupColor(box.group)
                }}
              >
                {box.group}
              </span>
            </div>

            {/* Box Details */}
            <div className="mb-4 text-center">
              <p className="text-base sm:text-lg font-semibold text-box-800 mb-1">{box.category}</p>
              <p className="text-sm text-box-600">{box.summary}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={generateBoxUrl(boxId)}
                size={160}
                level="M"
                includeMargin={true}
                fgColor={getGroupColor(box.group)}
                bgColor="#ffffff"
              />
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-box-500">
              <p>Scan to view details</p>
              <p>PackLog - Smart Moving Inventory</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={handleDownloadQR} className="flex-1 flex items-center gap-2 py-3 bg-box-600 hover:bg-box-700">
              <Download className="h-4 w-4" />
              Download QR
            </Button>
            <Link href={`/box/${boxId}`}>
              <Button variant="outline" className="flex-1 py-3 border-box-300 text-box-700 hover:bg-box-50">Back to Box</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-box-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-box-300 text-box-700 hover:bg-box-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-box-900">Box {box.boxNumber}</h1>
              <p className="text-box-600 text-sm sm:text-base">{box.summary}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBoxPhotoUpload(true)}
              className="flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50"
            >
              <Camera className="h-4 w-4" />
              {box.photo ? 'Change Photo' : 'Add Photo'}
            </Button>
            <Link href={`/box/${boxId}?qr=true`}>
              <Button variant="outline" size="sm" className="flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
            </Link>
            <Link href={`/box/${boxId}/edit`}>
              <Button variant="outline" size="sm" className="flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteBox}
              className="text-red-600 hover:text-red-700 flex items-center gap-1 py-2 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Box Details */}
        <div className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">{box.colorCode}</span>
              <div>
                <h3 className="font-semibold text-lg text-box-900">Box {box.boxNumber}</h3>
                <span
                  className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: getGroupColorLight(box.group),
                    color: getGroupColor(box.group)
                  }}
                >
                  {box.group}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-box-600 mb-1">Category</p>
              <p className="font-medium text-box-900">{box.category}</p>
            </div>

            <div>
              <p className="text-sm text-box-600 mb-1">Location</p>
              <p className="font-medium text-box-900">{box.location || 'Not specified'}</p>
            </div>

            {box.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-box-600 mb-1">Notes</p>
                <p className="text-box-900 text-sm sm:text-base">{box.notes}</p>
              </div>
            )}

            {box.photo && (
              <div className="sm:col-span-2">
                <p className="text-sm text-box-600 mb-2">Box Photo</p>
                <div className="w-20 h-20 rounded-lg border border-box-200 overflow-hidden">
                  <img
                    src={box.photo}
                    alt={`Box ${box.boxNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-box-900">Items ({items.length})</h2>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setShowPhotoCapture(true)}
                className="flex items-center gap-2 py-2 bg-box-600 hover:bg-box-700"
              >
                <Camera className="h-4 w-4" />
                AI Photo
              </Button>
              <Button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 py-2 bg-box-600 hover:bg-box-700"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="bg-box-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-box-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                    placeholder="Enter item name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-box-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                    placeholder="e.g., Kitchen, Electronics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-box-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={newItemNotes}
                    onChange={(e) => setNewItemNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddItem} disabled={!newItemName.trim()} className="py-2 bg-box-600 hover:bg-box-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Item
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="py-2 border-box-300 text-box-700 hover:bg-box-50">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-box-200 rounded-lg bg-white">
                {editingItem === item.id ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={editingItemName}
                      onChange={(e) => setEditingItemName(e.target.value)}
                      className="px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                    />
                    <input
                      type="text"
                      value={editingItemCategory}
                      onChange={(e) => setEditingItemCategory(e.target.value)}
                      className="px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                      placeholder="Category"
                    />
                    <input
                      type="text"
                      value={editingItemNotes}
                      onChange={(e) => setEditingItemNotes(e.target.value)}
                      className="px-3 py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent bg-white"
                      placeholder="Notes"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      {item.photo && (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border border-box-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-box-900">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-box-600 mb-1">{item.category}</p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-box-600 line-clamp-2">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-shrink-0">
                  {editingItem === item.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => item.id && handleUpdateItem(item.id)}
                        disabled={!editingItemName.trim()}
                        className="py-2 bg-box-600 hover:bg-box-700"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelEditing} className="py-2 border-box-300 text-box-700 hover:bg-box-50">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => startEditing(item)} className="py-2 border-box-300 text-box-700 hover:bg-box-50">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowMoveItem(true);
                        }}
                        className="py-2 border-box-300 text-box-700 hover:bg-box-50"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => item.id && handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700 py-2 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-box-500">
              <p>No items in this box yet.</p>
              <p className="text-sm">Click &quot;Add Item&quot; or &quot;AI Photo&quot; to get started.</p>
            </div>
          )}
        </div>

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <PhotoCapture
            onItemsAnalyzed={handleItemsAnalyzed}
            onClose={() => setShowPhotoCapture(false)}
            boxContext={`Box ${box.boxNumber} - ${box.category} - ${box.summary}`}
          />
        )}

        {/* Move Item Modal */}
        {showMoveItem && selectedItem && (
          <MoveItem
            item={selectedItem}
            currentBoxId={boxId}
            onMove={handleMoveItem}
            onClose={() => {
              setShowMoveItem(false);
              setSelectedItem(null);
            }}
          />
        )}

        {/* Box Photo Upload Modal */}
        {showBoxPhotoUpload && (
          <BoxPhotoUpload
            onPhotoUploaded={handleBoxPhotoUploaded}
            onClose={() => setShowBoxPhotoUpload(false)}
            currentPhoto={box.photo}
          />
        )}
      </div>
    </div>
  );
} 