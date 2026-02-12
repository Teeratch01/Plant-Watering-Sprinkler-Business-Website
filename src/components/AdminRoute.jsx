import React, { use, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../FirebaseConfig'; // เช็ค path ให้ถูก
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const AdminRoute = ({ children }) => {

    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-10 text-center">Checking permission...</div>;
    }

    if (!user || !isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
export default AdminRoute;