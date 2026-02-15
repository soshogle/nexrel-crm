<?php

namespace FSProVendor\Octolize\ShippingExtensions;

use FSProVendor\Octolize\ShippingExtensions\Page\Plugin;
use FSProVendor\Octolize\ShippingExtensions\Tracker\ViewPageTracker;
use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
/**
 * .
 */
class Page implements \FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable
{
    private const PARENT_SLUG = 'woocommerce';
    public const MENU_SLUG = 'octolize-shipping-extensions';
    public const SCREEN_ID = 'woocommerce_page_' . self::MENU_SLUG;
    /**
     * @var string
     */
    private $assets_url;
    /**
     * @var ViewPageTracker
     */
    private $view_page_tracker;
    /**
     * @param string $assets_url .
     * @param ViewPageTracker $view_page_tracker .
     */
    public function __construct(string $assets_url, \FSProVendor\Octolize\ShippingExtensions\Tracker\ViewPageTracker $view_page_tracker)
    {
        $this->assets_url = $assets_url;
        $this->view_page_tracker = $view_page_tracker;
    }
    /**
     * @return void
     */
    public function hooks() : void
    {
        \add_action('admin_menu', [$this, 'add_page'], 100);
    }
    /**
     * @return void
     */
    public function add_page() : void
    {
        \add_submenu_page(self::PARENT_SLUG, \_x('Shipping Extensions', 'Page title', 'flexible-shipping-pro'), $this->get_menu_title(), 'manage_options', self::MENU_SLUG, [$this, 'render_page']);
    }
    /**
     * @return void
     */
    public function render_page() : void
    {
        \wp_enqueue_style(\FSProVendor\Octolize\ShippingExtensions\Assets::HANDLE);
        $assets_url = $this->assets_url;
        $plugins = $this->get_plugins();
        $categories = $this->get_categories();
        require_once __DIR__ . '/views/html-shipping-extensions-page.php';
    }
    /**
     * @return string
     */
    private function get_menu_title() : string
    {
        $menu_title = \nl2br(\_x("Shipping\nExtensions", 'Menu Title', 'flexible-shipping-pro'));
        if ($this->should_add_badge()) {
            $menu_title .= ' <span class="update-plugins"><span class="update-count">1</span></span>';
        }
        return $menu_title;
    }
    /**
     * @return bool
     */
    private function should_add_badge() : bool
    {
        return !$this->view_page_tracker->option_exists();
    }
    /**
     * @return Plugin[]
     */
    private function get_plugins() : array
    {
        $plugins = [];
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Flexible Shipping PRO', 'flexible-shipping-pro'), \__('The best and the most powerful Table Rate shipping plugin for WooCommerce. Define the shipping rules based on numerous conditions and configure even the most complex shipping scenarios with ease.', 'flexible-shipping-pro'), 'flexible-shipping-pro.svg', 'flexible-shipping-pro/flexible-shipping-pro.php', \__('Customizable Rates', 'flexible-shipping-pro'), ' https://octol.io/fs-extensions');
        $plugin->add_url('https://octol.io/fs-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('UPS Live Rates and Access Points PRO', 'flexible-shipping-pro'), \__('WooCommerce UPS integration packed with many advanced features. Display the dynamically calculated live rates for UPS shipping methods and adjust them to your needs.', 'flexible-shipping-pro'), 'flexible-shipping-ups-pro.svg', 'flexible-shipping-ups-pro/flexible-shipping-ups-pro.php', \__('Live Rates', 'flexible-shipping-pro'), 'https://octol.io/ups-extensions');
        $plugin->add_url('https://octol.io/ups-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('DPD UK & DPD Local', 'flexible-shipping-pro'), \__('Ship your DPD orders faster with advanced DPD UK & DPD Local WooCommerce integration. Gather shipping details, download printable shipping labels and track parcels - everything is automated.', 'flexible-shipping-pro'), 'woocommerce-dpd-uk.svg', 'woocommerce-dpd-uk/woocommerce-dpd-uk.php', \__('Shipping Labels', 'flexible-shipping-pro'), 'https://octol.io/dpd-uk-extensions');
        $plugin->add_url('https://octol.io/dpd-uk-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('FedEx WooCommerce Live Rates PRO', 'flexible-shipping-pro'), \__('Enable the FedEx live rates for international delivery and integrate it with your shop in less than 5 minutes. Save your time and money – let the shipping cost be calculated automatically.', 'flexible-shipping-pro'), 'flexible-shipping-fedex-pro.svg', 'flexible-shipping-fedex-pro/flexible-shipping-fedex-pro.php', \__('Live Rates', 'flexible-shipping-pro'), 'https://octol.io/fedex-extensions');
        $plugin->add_url('https://octol.io/fedex-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Distance Based Shipping Rates', 'flexible-shipping-pro'), \__('Offer shipping rates based on Distance or Total Travel Time calculated by Google Distance Matrix API and don\'t overpay for shipping.', 'flexible-shipping-pro'), 'octolize-distance-based-shipping-rates.svg', 'octolize-distance-based-shipping-rates/octolize-distance-based-shipping-rates.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/dbs-extensions');
        $plugin->add_url('https://octol.io/dbs-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Flexible Shipping Locations', 'flexible-shipping-pro'), \__('Calculate the shipping cost based on location. Define your own custom locations, use the WooCommerce defaults or the ones created by 3rd party plugins.', 'flexible-shipping-pro'), 'flexible-shipping-locations.svg', 'flexible-shipping-locations/flexible-shipping-locations.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/locations-extensions');
        $plugin->add_url('https://octol.io/locations-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Flexible Printing', 'flexible-shipping-pro'), \__('Automate your shipping process. Print the shipping labels on thermal printers via PrintNode service. Let the labels be printed automatically the same time the order is placed.', 'flexible-shipping-pro'), 'flexible-printing.svg', 'flexible-printing/flexible-printing.php', \__('Shipping Labels', 'flexible-shipping-pro'), 'https://octol.io/printing-extensions');
        $plugin->add_url('https://octol.io/printing-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Flexible Shipping Import / Export', 'flexible-shipping-pro'), \__('Use the CSV files to import or export your shipping methods. Edit, update, move or backup the ready configurations and shipping scenarios.', 'flexible-shipping-pro'), 'flexible-shipping-import-export.svg', 'flexible-shipping-import-export/flexible-shipping-import-export.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/fsie-extensions');
        $plugin->add_url('https://octol.io/fsie-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('DHL Express Live Rates PRO', 'flexible-shipping-pro'), \__('WooCommerce DHL Express integration packed with many advanced features. Display the dynamically calculated live rates for DHL Express shipping methods and adjust them to your needs.', 'flexible-shipping-pro'), 'flexible-shipping-dhl-express-pro.svg', 'flexible-shipping-dhl-express-pro/flexible-shipping-dhl-express-pro.php', \__('Live Rates', 'flexible-shipping-pro'), 'https://octol.io/dhl-express-extensions');
        $plugin->add_url('https://octol.io/dhl-express-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Multi Vendor Shipping', 'flexible-shipping-pro'), \__('Define precisely the shipping cost calculation rules for each Vendor / Product Author in your marketplace or multivendor store.', 'flexible-shipping-pro'), 'flexible-shipping-vendors.svg', 'flexible-shipping-vendors/flexible-shipping-vendors.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/mvs-extensions');
        $plugin->add_url('https://octol.io/mvs-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Shipping Packages', 'flexible-shipping-pro'), \__('Split the WooCommerce cart content into multiple packages based on various conditions like shipping class.', 'flexible-shipping-pro'), 'flexible-shipping-packages.svg', 'flexible-shipping-packages/flexible-shipping-packages.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/packages-extensions');
        $plugin->add_url('https://octol.io/packages-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Conditional Shipping Methods', 'flexible-shipping-pro'), \__('Conditionally display and hide the shipping methods in your WooCommerce store. Define the rules when the specific shipping methods, e.g., live rates should be available to pick and when not to.', 'flexible-shipping-pro'), 'flexible-shipping-conditional-methods.svg', 'flexible-shipping-conditional-methods/flexible-shipping-conditional-methods.php', \__('Live Rates', 'flexible-shipping-pro'), 'https://octol.io/csm-extensions');
        $plugin->add_url('https://octol.io/csm-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('UPS Labels and Tracking', 'flexible-shipping-pro'), \__('Create the shipments, generate the printable UPS shipping labels for the placed orders and track the parcels directly from your WooCommerce store.', 'flexible-shipping-pro'), 'flexible-shipping-ups-labels.svg', 'flexible-shipping-ups-labels/flexible-shipping-ups-labels.php', \__('Shipping Labels', 'flexible-shipping-pro'), 'https://octol.io/ups-labels-extensions');
        $plugin->add_url('https://octol.io/ups-labels-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Delivery Date Picker', 'flexible-shipping-pro'), \__('Let your customers choose a convenient delivery date for the ordered products and make the shipping cost dependent on the date they choose.', 'flexible-shipping-pro'), 'octolize-delivery-date-picker.svg', 'octolize-delivery-date-picker/octolize-delivery-date-picker.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/ddp-extensions');
        $plugin->add_url('https://octol.io/ddp-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('USPS Live Rates PRO', 'flexible-shipping-pro'), \__('Serve your customers the automatically and real-time calculated USPS shipping rates. Add the handling fees, insurance and adjust them to your needs with just a few clicks.', 'flexible-shipping-pro'), 'flexible-shipping-usps-pro.svg', 'flexible-shipping-usps-pro/flexible-shipping-usps-pro.php', \__('Live Rates', 'flexible-shipping-pro'), 'https://octol.io/usps-extensions');
        $plugin->add_url('https://octol.io/usps-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        $plugin = new \FSProVendor\Octolize\ShippingExtensions\Page\Plugin(\__('Shipping Cost on Product Page PRO', 'flexible-shipping-pro'), \__('Let your customers calculate and see the shipping cost on product pages based on the entered shipping destination and cart contents. Decide how and when exactly you want the shipping cost calculator to display.', 'flexible-shipping-pro'), 'octolize-shipping-cost-on-product-page-pro.svg', 'octolize-shipping-cost-on-product-page-pro/octolize-shipping-cost-on-product-page-pro.php', \__('Customizable Rates', 'flexible-shipping-pro'), 'https://octol.io/scpp-extensions');
        $plugin->add_url('https://octol.io/scpp-extensions-pl', 'pl_PL');
        $plugins[] = $plugin;
        return $plugins;
    }
    /**
     * @return array
     */
    private function get_categories() : array
    {
        return [\__('Live Rates', 'flexible-shipping-pro'), \__('Customizable Rates', 'flexible-shipping-pro'), \__('Shipping Labels', 'flexible-shipping-pro')];
    }
}
