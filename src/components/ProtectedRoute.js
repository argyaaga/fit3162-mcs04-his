import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children, userRole }) => { // Receive userRole prop
    const location = useLocation();
    //SRS: RENDER ISSUE HIDDEN
    // Check if the current path is '/account'
    const isAccountPage = location.pathname === '/account';
    const isMedicalRecordPage = location.pathname === '/medicalrecord';

    if (userRole === "") {
        return <Navigate to="/waiting" state={{ from: location }} replace />; 
    } else if (userRole !== 'admin' && isAccountPage && (userRole === "doctor" || userRole === "nurse")) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />; 
    } else if (userRole !== 'doctor' && isMedicalRecordPage && (userRole === "admin" || userRole === "nurse")) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />; 
    } else if (userRole !== "" && userRole !== null){
        return children; 
    }
};