'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, QrCode, Eye, Package, LogOut } from 'lucide-react';
import { getAllBoxes, searchBoxes, searchItems, getItems, Box, Item } from '@/lib/firestore';
import { signOutUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getGroupColor, getGroupColorLight } from '@/lib/utils/qr';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/protected-route';
import { toast } from 'sonner';

interface SearchResult {
  item: Item;
  box: Box;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<Box[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadBoxes();
    }
  }, [user, authLoading]);

  const loadAllItems = useCallback(async () => {
    if (!user) return;

    setIsSearching(true);
    setError(null);
    try {
      const allBoxes = await getAllBoxes(user.uid);
      const allItems: SearchResult[] = [];

      for (const box of allBoxes) {
        try {
          const items = await getItems(box.id!);
          items.forEach(item => {
            allItems.push({ item, box });
          });
        } catch (error) {
          console.warn(`Failed to load items for box ${box.id}:`, error);
          // Continue with other boxes
        }
      }

      // Filter by group if selected
      let filteredResults = allItems;
      if (selectedGroup !== 'all') {
        filteredResults = allItems.filter(result => result.box.group === selectedGroup);
      }

      setSearchResults(filteredResults);
      setFilteredBoxes([]); // Clear box results when showing items
    } catch (error) {
      console.error('Error loading all items:', error);
      setError('Failed to load items. Please try refreshing the page.');
    } finally {
      setIsSearching(false);
    }
  }, [selectedGroup, user]);

  const performSearch = useCallback(async () => {
    if (!user) return;

    setIsSearching(true);
    setError(null);
    try {
      const itemResults = await searchItems(searchTerm, user.uid);

      // Filter by group if selected
      let filteredResults = itemResults;
      if (selectedGroup !== 'all') {
        filteredResults = itemResults.filter(result => result.box.group === selectedGroup);
      }

      setSearchResults(filteredResults);
      setFilteredBoxes([]); // Clear box results when searching
    } catch (error) {
      console.error('Error performing search:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedGroup, user]);

  const filterBoxes = useCallback(() => {
    let filtered = boxes;

    // Filter by group
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(box => box.group === selectedGroup);
    }

    setFilteredBoxes(filtered);
  }, [boxes, selectedGroup]);

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch();
      setShowItems(true); // Auto-switch to items when searching
    } else {
      if (showItems) {
        loadAllItems();
      } else {
        filterBoxes();
        setSearchResults([]);
      }
    }
  }, [searchTerm, performSearch, loadAllItems, filterBoxes, showItems]);

  const loadBoxes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const allBoxes = await getAllBoxes(user.uid);
      setBoxes(allBoxes);
    } catch (error) {
      console.error('Error loading boxes:', error);
      setError('Failed to load boxes. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const groups = ['Group 1', 'Group 2', 'Group 3', 'Storage'];

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4">
            <img
              src="/packLog2.png"
              alt="PackLog Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-box-600 mx-auto"></div>
          <p className="mt-4 text-box-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while boxes are being loaded
  if (loading) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4">
            <img
              src="/packLog2.png"
              alt="PackLog Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-box-600 mx-auto"></div>
          <p className="mt-4 text-box-600">Loading boxes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-box-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-box-900 mb-2">Connection Error</h2>
          <p className="text-box-600 mb-6">{error}</p>
          <Button onClick={loadBoxes} className="flex items-center gap-2 bg-box-600 hover:bg-box-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-box-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-28 sm:h-28">
              <img
                src="/packLog2.png"
                alt="PackLog Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-box-600 text-base">Smart moving inventory with QR codes</p>
          </div>
        </div>

        {/* User Info and Sign Out */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-box-600">
            Welcome, {user?.email}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-box-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent text-base bg-white"
              />
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Group Filter */}
              <div className="flex items-center gap-2">
                <Filter className="text-box-400 h-5 w-5" />
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-3 sm:py-2 border border-box-300 rounded-lg focus:ring-2 focus:ring-box-500 focus:border-transparent text-base bg-white"
                >
                  <option value="all">All Groups</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={!showItems ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowItems(false)}
                  className="flex items-center gap-1"
                >
                  <Package className="h-4 w-4" />
                  Boxes
                </Button>
                <Button
                  variant={showItems ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowItems(true)}
                  className="flex items-center gap-1"
                >
                  <Search className="h-4 w-4" />
                  Items
                </Button>
              </div>

              {/* Add Box Button */}
              <Link href="/box/new" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto flex items-center gap-2 py-3 sm:py-2">
                  <Plus className="h-5 w-5" />
                  Add Box
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchTerm.trim() && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-box-900">
                Search Results ({searchResults.length} items)
              </h2>
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-box-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-box-600"></div>
                  Searching...
                </div>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {searchResults.map((result) => (
                  <div key={`${result.box.id}-${result.item.id}`} className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-4">
                      {result.item.photo && (
                        <img
                          src={result.item.photo}
                          alt={result.item.name}
                          className="w-16 h-16 object-cover rounded border border-box-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 text-box-900">{result.item.name}</h3>
                        {result.item.category && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-box-100 text-box-700 rounded-full mb-2">
                            {result.item.category}
                          </span>
                        )}
                        {result.item.notes && (
                          <p className="text-box-600 text-sm line-clamp-2">{result.item.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Box Information */}
                    <div className="border-t border-box-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{result.box.colorCode}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-box-900">Box {result.box.boxNumber}</p>
                          <p className="text-xs text-box-600">{result.box.category}</p>
                        </div>
                        <span
                          className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: getGroupColorLight(result.box.group),
                            color: getGroupColor(result.box.group)
                          }}
                        >
                          {result.box.group}
                        </span>
                      </div>
                      <p className="text-sm text-box-600 mb-3">{result.box.summary}</p>

                      <div className="flex gap-2">
                        <Link href={`/box/${result.box.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                            <Eye className="h-4 w-4" />
                            View Box
                          </Button>
                        </Link>
                        <Link href={`/box/${result.box.id}?qr=true`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                            <QrCode className="h-4 w-4" />
                            QR
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isSearching && (
              <div className="text-center py-12">
                <div className="text-box-400 mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-box-900 mb-2">No items found</h3>
                <p className="text-box-600">Try adjusting your search terms or filters</p>
              </div>
            )}
          </div>
        )}

        {/* Content based on toggle */}
        {!searchTerm.trim() && (
          <>
            {showItems ? (
              // Items View
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-box-900">
                      All Items ({searchResults.length} items)
                    </h2>
                    {isSearching && (
                      <div className="flex items-center gap-2 text-sm text-box-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-box-600"></div>
                        Loading...
                      </div>
                    )}
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {searchResults.map((result) => (
                      <div key={`${result.box.id}-${result.item.id}`} className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3 mb-4">
                          {result.item.photo && (
                            <img
                              src={result.item.photo}
                              alt={result.item.name}
                              className="w-16 h-16 object-cover rounded border border-box-200 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 text-box-900">{result.item.name}</h3>
                            {result.item.category && (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-box-100 text-box-700 rounded-full mb-2">
                                {result.item.category}
                              </span>
                            )}
                            {result.item.notes && (
                              <p className="text-box-600 text-sm line-clamp-2">{result.item.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Box Information */}
                        <div className="border-t border-box-200 pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{result.box.colorCode}</span>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-box-900">Box {result.box.boxNumber}</p>
                              <p className="text-xs text-box-600">{result.box.category}</p>
                            </div>
                            <span
                              className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: getGroupColorLight(result.box.group),
                                color: getGroupColor(result.box.group)
                              }}
                            >
                              {result.box.group}
                            </span>
                          </div>
                          <p className="text-sm text-box-600 mb-3">{result.box.summary}</p>

                          <div className="flex gap-2">
                            <Link href={`/box/${result.box.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                                <Eye className="h-4 w-4" />
                                View Box
                              </Button>
                            </Link>
                            <Link href={`/box/${result.box.id}?qr=true`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                                <QrCode className="h-4 w-4" />
                                QR
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching && (
                  <div className="text-center py-12">
                    <div className="text-box-400 mb-4">
                      <Package className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-box-900 mb-2">
                      {selectedGroup !== 'all' ? 'No items in this group' : 'No items yet'}
                    </h3>
                    <p className="text-box-600 mb-6">
                      {selectedGroup !== 'all'
                        ? 'Try selecting a different group or create a new box'
                        : 'Get started by creating your first box and adding items'
                      }
                    </p>
                    {selectedGroup === 'all' && (
                      <Link href="/box/new">
                        <Button className="flex items-center gap-2 py-3 bg-box-600 hover:bg-box-700">
                          <Plus className="h-5 w-5" />
                          Create First Box
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Boxes View
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredBoxes.map((box) => (
                    <div key={box.id} className="bg-white rounded-lg shadow-sm border border-box-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
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
                        {box.photo && (
                          <div className="ml-2 flex-shrink-0 flex items-center">
                            <div className="w-16 h-16 rounded-lg border border-box-200 overflow-hidden">
                              <img
                                src={box.photo}
                                alt={`Box ${box.boxNumber}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-box-600 mb-1">Category</p>
                        <p className="font-medium text-box-900">{box.category}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-box-600 mb-1">Summary</p>
                        <p className="text-box-900 text-sm sm:text-base">{box.summary}</p>
                      </div>

                      {box.location && (
                        <div className="mb-4">
                          <p className="text-sm text-box-600 mb-1">Location</p>
                          <p className="text-box-900 text-sm sm:text-base">{box.location}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link href={`/box/${box.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/box/${box.id}?qr=true`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full flex items-center gap-1 py-2 border-box-300 text-box-700 hover:bg-box-50">
                            <QrCode className="h-4 w-4" />
                            QR
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State for Boxes */}
                {filteredBoxes.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-box-400 mb-4">
                      <Package className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-box-900 mb-2">
                      {selectedGroup !== 'all' ? 'No boxes in this group' : 'No boxes yet'}
                    </h3>
                    <p className="text-box-600 mb-6">
                      {selectedGroup !== 'all'
                        ? 'Try selecting a different group or create a new box'
                        : 'Get started by creating your first box'
                      }
                    </p>
                    {selectedGroup === 'all' && (
                      <Link href="/box/new">
                        <Button className="flex items-center gap-2 py-3 bg-box-600 hover:bg-box-700">
                          <Plus className="h-5 w-5" />
                          Create First Box
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
} 