import { useUser } from "@clerk/clerk-react";
import posthog from "posthog-js";
import App from "../../App";
import { useEffect, useRef } from "react";
import FullPageSpinner from "../custom-ui/FullPageSpinner";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";
import { useStore } from "../../store/store";
import AvatarDropdown from "./AvatarDropdown";
import { UserResponse } from "./types";
import { POSTHOG_HOST, POSTHOG_KEY, SAAS_BACKEND_URL } from "../../config";
import LandingPage from "./LandingPage";

function AppContainer() {
  const { isSignedIn, isLoaded } = useUser();

  const setSubscriberTier = useStore((state) => state.setSubscriberTier);

  // For fetching user
  const authenticatedFetch = useAuthenticatedFetch();
  const isInitRequestInProgress = useRef(false);

  // Get information from our backend about the user (subscription status)
  useEffect(() => {
    const init = async () => {
      // Make sure there's only one request in progress
      // so that we don't create multiple users
      if (isInitRequestInProgress.current) return;
      isInitRequestInProgress.current = true;

      const user: UserResponse = await authenticatedFetch(
        SAAS_BACKEND_URL + "/users/create",
        "POST"
      );

      // If the user is not signed in, authenticatedFetch will return undefined
      if (!user) {
        isInitRequestInProgress.current = false;
        return;
      }

      if (!user.subscriber_tier) {
        setSubscriberTier("free");
      } else {
        // Initialize PostHog only for paid users
        posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST });
        // Identify the user to PostHog
        posthog.identify(user.email, {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        });

        setSubscriberTier(user.subscriber_tier);
      }

      isInitRequestInProgress.current = false;
    };

    init();
  }, []);

  // If Clerk is still loading, show a spinner
  if (!isLoaded) return <FullPageSpinner />;

  // If the user is not signed in, show the landing page
  if (isLoaded && !isSignedIn) return <LandingPage />;

  // If the user is signed in, show the app
  return (
    <>
      <App
        navbarComponent={
          <div className="flex justify-end items-center gap-x-2 px-10 mt-0 mb-4">
            <AvatarDropdown />
          </div>
        }
      />
    </>
  );
}

export default AppContainer;