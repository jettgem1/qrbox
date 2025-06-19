import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Retry function for network operations
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

export interface Box {
  id?: string;
  userId: string;
  boxNumber: number;
  group: string;
  category: string;
  summary: string;
  colorCode: string;
  location?: string;
  notes?: string;
  photo?: string;
  createdAt: Timestamp;
}

export interface Item {
  id?: string;
  userId: string;
  name: string;
  notes?: string;
  category?: string;
  photo?: string;
  createdAt: Timestamp;
}

export interface Group {
  id?: string;
  userId: string;
  name: string;
  createdAt: Timestamp;
}

export const createBox = async (boxData: Omit<Box, 'id' | 'createdAt'>): Promise<Box> => {
  return retryOperation(async () => {
    const docRef = await addDoc(collection(db, 'boxes'), {
      ...boxData,
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, ...boxData, createdAt: Timestamp.now() };
  });
};

export const getBox = async (id: string): Promise<Box> => {
  return retryOperation(async () => {
    const docRef = doc(db, 'boxes', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Box;
    } else {
      throw new Error('Box not found');
    }
  });
};

export const getAllBoxes = async (userId: string): Promise<Box[]> => {
  return retryOperation(async () => {
    const q = query(
      collection(db, 'boxes'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Box[];
  });
};

export const updateBox = async (id: string, updates: Partial<Box>): Promise<void> => {
  return retryOperation(async () => {
    const docRef = doc(db, 'boxes', id);
    await updateDoc(docRef, updates);
  });
};

export const deleteBox = async (id: string): Promise<void> => {
  return retryOperation(async () => {
    const docRef = doc(db, 'boxes', id);
    await deleteDoc(docRef);
  });
};

export const getBoxesByGroup = async (group: string, userId: string) => {
  return retryOperation(async () => {
    const q = query(
      collection(db, 'boxes'),
      where('userId', '==', userId),
      where('group', '==', group),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Box[];
  });
};

export const searchBoxes = async (searchTerm: string, userId: string) => {
  return retryOperation(async () => {
    const allBoxes = await getAllBoxes(userId);
    const searchLower = searchTerm.toLowerCase();

    return allBoxes.filter(box =>
      box.summary.toLowerCase().includes(searchLower) ||
      box.category.toLowerCase().includes(searchLower) ||
      (box.notes && box.notes.toLowerCase().includes(searchLower))
    );
  });
};

export const createItem = async (boxId: string, itemData: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
  return retryOperation(async () => {
    const docRef = await addDoc(collection(db, 'boxes', boxId, 'items'), {
      ...itemData,
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, ...itemData, createdAt: Timestamp.now() };
  });
};

export const getItems = async (boxId: string): Promise<Item[]> => {
  return retryOperation(async () => {
    const q = query(collection(db, 'boxes', boxId, 'items'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
  });
};

export const updateItem = async (boxId: string, itemId: string, updates: Partial<Item>): Promise<void> => {
  return retryOperation(async () => {
    const docRef = doc(db, 'boxes', boxId, 'items', itemId);
    await updateDoc(docRef, updates);
  });
};

export const deleteItem = async (boxId: string, itemId: string): Promise<void> => {
  return retryOperation(async () => {
    const docRef = doc(db, 'boxes', boxId, 'items', itemId);
    await deleteDoc(docRef);
  });
};

export const moveItem = async (fromBoxId: string, toBoxId: string, item: Item): Promise<void> => {
  return retryOperation(async () => {
    const batch = writeBatch(db);

    // Delete from original box
    const fromDocRef = doc(db, 'boxes', fromBoxId, 'items', item.id!);
    batch.delete(fromDocRef);

    // Add to new box
    const toCollectionRef = collection(db, 'boxes', toBoxId, 'items');
    const newItemData = { ...item };
    delete newItemData.id; // Remove the old ID
    const newDocRef = doc(toCollectionRef);
    batch.set(newDocRef, { ...newItemData, createdAt: Timestamp.now() });

    await batch.commit();
  });
};

export const searchItems = async (searchTerm: string, userId: string) => {
  return retryOperation(async () => {
    const allBoxes = await getAllBoxes(userId);
    const searchLower = searchTerm.toLowerCase();
    const results: Array<{ item: Item; box: Box }> = [];

    for (const box of allBoxes) {
      try {
        const items = await getItems(box.id!);
        const matchingItems = items.filter(item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.notes && item.notes.toLowerCase().includes(searchLower))
        );

        matchingItems.forEach(item => {
          results.push({ item, box });
        });
      } catch (error) {
        console.warn(`Failed to get items for box ${box.id}:`, error);
        // Continue with other boxes even if one fails
      }
    }

    return results;
  });
};

export const createGroup = async (name: string, userId: string): Promise<Group> => {
  return retryOperation(async () => {
    const docRef = await addDoc(collection(db, 'groups'), {
      name,
      userId,
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, name, userId, createdAt: Timestamp.now() };
  });
};

export const getAllGroups = async (userId: string): Promise<Group[]> => {
  return retryOperation(async () => {
    const q = query(
      collection(db, 'groups'),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];
  });
};

// Auth functions
export const signIn = async (email: string, password: string) => {
  return retryOperation(async () => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  });
};

export const signUp = async (email: string, password: string) => {
  return retryOperation(async () => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  });
};

export const signOutUser = async () => {
  return retryOperation(async () => {
    await signOut(auth);
  });
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
}; 