export const checkAuth = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('isAuthenticated') === 'true';
    }
    return false;
};

export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('activeTabId');
        sessionStorage.removeItem('tabId');
    }
}; 