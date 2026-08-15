const countryChangeEvent = "atlas-country-change";

export function subscribeToMapCountry(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(countryChangeEvent, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(countryChangeEvent, callback);
  };
}

export function mapCountryFromLocation() {
  return new URLSearchParams(window.location.search).get("country") ?? "";
}

export function serverMapCountryFallback() {
  return "";
}

export function updateMapCountry(countryId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("country", countryId);
  window.history.replaceState({}, "", url);
  window.dispatchEvent(new Event(countryChangeEvent));
}
