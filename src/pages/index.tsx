import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from 'next';

import { PlaygroundConnect } from "@/components/PlaygroundConnect";
import Playground from "@/components/playground/Playground";
import { PlaygroundToast, ToastType } from "@/components/toast/PlaygroundToast";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";
import { ConnectionMode, ConnectionProvider, useConnection } from "@/hooks/useConnection";
import { ToastProvider, useToast } from "@/components/toast/ToasterProvider";
import { logout } from "@/utils/auth";

const themeColors = [
  "pink",
];

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <ToastProvider>
      <ConfigProvider>
        <ConnectionProvider>
          <HomeInner />
        </ConnectionProvider>
      </ConfigProvider>
    </ToastProvider>
  );
}

export function HomeInner() {
  const router = useRouter();
  const { shouldConnect, wsUrl, token, mode, connect, disconnect } =
    useConnection();
  
  const {config} = useConfig();
  const { toastMessage, setToastMessage } = useToast();
  const [timeLeft, setTimeLeft] = useState(0);

  // Immediate authentication check
  useEffect(() => {
    // Check authentication immediately when component mounts
    const checkAndRedirect = () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const sessionStartTime = localStorage.getItem('sessionStartTime');
      const currentTabId = sessionStorage.getItem('tabId');
      const activeTabId = localStorage.getItem('activeTabId');

      if (!isAuthenticated || !sessionStartTime || !currentTabId || !activeTabId || currentTabId !== activeTabId) {
        // Clear any existing auth data and redirect
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('activeTabId');
        sessionStorage.removeItem('tabId');
        router.push('/login');
        return false;
      }
      return true;
    };

    // Run check immediately
    if (!checkAndRedirect()) {
      return;
    }
  }, [router]);

  // Timer effect
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    const SESSION_DURATION = 15 * 60; // 15 minutes in seconds
    const currentTabId = sessionStorage.getItem('tabId');
    const activeTabId = localStorage.getItem('activeTabId');

    // Check if this is a new tab or not the active tab
    if (!currentTabId || currentTabId !== activeTabId) {
      logout();
      router.push('/login');
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If no session start time exists or it's invalid, redirect to login
    if (!sessionStartTime) {
      logout();
      router.push('/login');
      return;
    }

    const startTime = parseInt(sessionStartTime);
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - startTime;
    const remainingTime = SESSION_DURATION - elapsedTime;

    // If session has expired
    if (remainingTime <= 0) {
      logout();
      router.push('/login');
      return;
    }

    // Set initial remaining time
    setTimeLeft(remainingTime);

    // Start the countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          logout();
          router.push('/login');
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(timer);
    };
  }, [router]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleConnect = useCallback(
    async (c: boolean, mode: ConnectionMode) => {
      c ? connect(mode) : disconnect();
    },
    [connect, disconnect]
  );

  const showPG = useMemo(() => {
    if (process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      return true;
    }
    if(wsUrl) {
      return true;
    }
    return false;
  }, [wsUrl])

  return (
    <>
      <Head>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta
          property="og:image"
          content="https://livekit.io/images/og/agents-playground.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="relative flex flex-col justify-center px-4 items-center h-full w-full bg-black repeating-square-background">
        <div className="absolute bottom-4 right-4 text-white bg-gray-900 px-3 py-1 rounded-md shadow-lg">
          Session expires in: {formatTime(timeLeft)}
        </div>
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="left-0 right-0 top-0 absolute z-10"
              initial={{ opacity: 0, translateY: -50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -50 }}
            >
              <PlaygroundToast />
            </motion.div>
          )}
        </AnimatePresence>
        {showPG ? (
          <LiveKitRoom
            className="flex flex-col h-full w-full"
            serverUrl={wsUrl}
            token={token}
            connect={shouldConnect}
            onError={(e) => {
              setToastMessage({ message: e.message, type: "error" });
              console.error(e);
            }}
          >
            <Playground
              themeColors={themeColors}
              onConnect={(c) => {
                const m = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "env" : mode;
                handleConnect(c, m);
              }}
            />
            <RoomAudioRenderer />
            <StartAudio label="Click to enable audio playback" />
          </LiveKitRoom>
        ) : (
          <PlaygroundConnect
            accentColor={themeColors[0]}
            onConnectClicked={(mode) => {
              handleConnect(true, mode);
            }}
          />
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
  
  // Check for authentication cookie/session
  if (typeof window === 'undefined') {
    // We're on the server side
    const cookies = req.headers.cookie;
    if (!cookies || !cookies.includes('isAuthenticated=true')) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
  }

  return {
    props: {}, // will be passed to the page component as props
  };
}