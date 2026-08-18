const GOOGLE_MAPS_CALLBACK = "__beefNoodlesGoogleMapsReady";

let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in a browser"));
  }

  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const searchParams = new URLSearchParams({
      key: apiKey,
      loading: "async",
      callback: GOOGLE_MAPS_CALLBACK,
    });

    window[GOOGLE_MAPS_CALLBACK] = () => {
      delete window[GOOGLE_MAPS_CALLBACK];
      resolve();
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${searchParams}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onerror = () => {
      delete window[GOOGLE_MAPS_CALLBACK];
      googleMapsPromise = null;
      reject(new Error("Google Maps could not load"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
