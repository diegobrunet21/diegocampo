/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import BuyerDetail from './pages/BuyerDetail';
import Buyers from './pages/Buyers';
import Capital from './pages/Capital';
import Dashboard from './pages/Dashboard';
import FinancingDetail from './pages/FinancingDetail';
import ListingDetail from './pages/ListingDetail';
import Listings from './pages/Listings';
import MatchDetail from './pages/MatchDetail';
import Matches from './pages/Matches';
import Onboarding from './pages/Onboarding';
import QuickAdd from './pages/QuickAdd';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BuyerDetail": BuyerDetail,
    "Buyers": Buyers,
    "Capital": Capital,
    "Dashboard": Dashboard,
    "FinancingDetail": FinancingDetail,
    "ListingDetail": ListingDetail,
    "Listings": Listings,
    "MatchDetail": MatchDetail,
    "Matches": Matches,
    "Onboarding": Onboarding,
    "QuickAdd": QuickAdd,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};