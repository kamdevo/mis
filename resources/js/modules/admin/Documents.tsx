import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import FormsTable from '@/components/forms-module/FormsTable';

const Documents = () => {
    return (
        <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
                <FormsTable />
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default Documents;
