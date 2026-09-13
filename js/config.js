/* App-wide constants: the version, the names, and every storage key in one place. */
const APP_VERSION = "1.9.0";
const APP_NAME = "StampLogs";
const APP_TITLE = "StampLogs";
const UNDATED = "undated";
const KINDS = ["traveled","planned"];
const NS = "http://www.w3.org/2000/svg";
const ISLANDS = ["Luzon","Visayas","Mindanao"];

/* localStorage */
const SAVE_KEY = "stamplogs.visited.v1";
const NICK_KEY = "stamplogs.nickname.v1";
const TRIP_KEY = "stamplogs.trips.v1";
const GROUP_KEY = "stamplogs.groupby.v1";
const PLAN_KEY = "stamplogs.showplanned.v1";
const VIEW_KEY = "stamplogs.view.v1", PSORT_KEY = "stamplogs.photosort.v1";

/* IndexedDB */
const PHOTO_DB = "stamplogs-photos", OLD_PHOTO_DB = "ph82-photos", PHOTO_STORE = "photos";
const PHOTO_MIGRATED_KEY = "stamplogs.photos.migrated.v1";

/* the phone layout: the tools menu, the folding list and the bottom-sheet panel */
const NARROW_QUERY = "(max-width:600px)";
