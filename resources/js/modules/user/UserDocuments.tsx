import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { UserDashboardLayout } from '@/components/layouts/UserDashboardLayout';
import UserDocumentsList from '@/components/my-documents-user/UserDocumentsList';

const UserDocuments: React.FC = () => {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <UserDocumentsList />
            </UserDashboardLayout>
        </ProtectedRoute>
    );
};

export default UserDocuments;
