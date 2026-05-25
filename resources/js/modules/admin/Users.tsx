import UsersTable from "../../components/users-module/UsersTable";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/layouts/DashboardLayout";

export function Users() {
    return (
        <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
                <UsersTable />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
