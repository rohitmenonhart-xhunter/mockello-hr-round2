import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function LoginPage() {
    const [accessKey, setAccessKey] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const router = useRouter();

    // Clear any existing authentication when login page loads
    useEffect(() => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('activeTabId');
        sessionStorage.removeItem('tabId');
    }, []);

    const validateKey = async () => {
        if (!accessKey) {
            setErrorMessage("Please enter an access key!");
            return;
        }

        const payload = { access_key: accessKey };

        try {
            const response = await fetch("https://serverforpaymentmockello.onrender.com/validate-key", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.message) {
                // Generate a unique tab ID
                const tabId = Math.random().toString(36).substring(2, 15);
                // Store authentication status, session start time, and tab ID
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('sessionStartTime', Math.floor(Date.now() / 1000).toString());
                sessionStorage.setItem('tabId', tabId);
                localStorage.setItem('activeTabId', tabId);
                // Set authentication cookie
                document.cookie = `isAuthenticated=true; path=/; max-age=${15 * 60}`; // 15 minutes
                router.push("/"); // Redirect to main page
            } else if (data.error) {
                setErrorMessage(data.error);
            }
        } catch (error) {
            console.error("Error:", error);
            setErrorMessage("An error occurred while validating the key.");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validateKey();
    };

    return (
        <>
            <Head>
                <title>Login - Access Key Validation</title>
                <meta name="description" content="Enter your access key to continue" />
            </Head>
            <main className="min-h-screen flex items-center justify-center bg-black repeating-square-background">
                <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-96">
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">Access Key Validation</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="access_key" className="block text-sm font-medium text-gray-300 mb-2">
                                Enter your Access Key:
                            </label>
                            <input
                                type="text"
                                id="access_key"
                                value={accessKey}
                                onChange={(e) => setAccessKey(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors"
                        >
                            Validate Key
                        </button>
                    </form>
                    {errorMessage && (
                        <p className="mt-4 text-red-500 text-sm text-center">{errorMessage}</p>
                    )}
                </div>
            </main>
        </>
    );
} 