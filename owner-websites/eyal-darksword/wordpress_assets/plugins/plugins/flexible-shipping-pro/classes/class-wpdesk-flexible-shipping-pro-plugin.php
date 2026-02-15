<?php
/**
 * Plugin.
 *
 * @package Flexible Shipping PRO
 */

use FSProVendor\Octolize\ShippingExtensions\ShippingExtensions;
use FSProVendor\Octolize\Tracker\OptInNotice\ShouldDisplayNever;
use FSProVendor\Octolize\Tracker\TrackerInitializer;
use FSProVendor\WPDesk\FS\Compatibility\PluginCompatibility;
use FSProVendor\WPDesk\Logger\WPDeskLoggerFactory;
use FSProVendor\WPDesk\Notice\Notice;
use FSProVendor\WPDesk\PluginBuilder\Plugin\AbstractPlugin;
use FSProVendor\WPDesk\PluginBuilder\Plugin\HookableCollection;
use FSProVendor\WPDesk\PluginBuilder\Plugin\HookableParent;
use FSProVendor\WPDesk\PluginBuilder\Plugin\TemplateLoad;
use FSProVendor\WPDesk\Beacon\BeaconPro;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use WPDesk\FSPro\TableRate\DefaultRulesSettings;
use WPDesk\FSPro\TableRate\FreeShipping\FreeShippingNoticeAllowed;
use WPDesk\FSPro\TableRate\ImportExport\Conditions\ExportData;
use WPDesk\FSPro\TableRate\ImportExport\Conditions\ImportData;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\AjaxHandler;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\CategoriesOptions;
use WPDesk\FSPro\TableRate\Rule\PreconfiguredScenarios\PreconfiguredScenariosPro;
use WPDesk\FSPro\TableRate\Rule\RuleConditions;
use WPDesk\FSPro\TableRate\Rule\SpecialActions;
use WPDesk\FSPro\TableRate\RuleCost\RuleAdditionalCostHooks;
use WPDesk\FSPro\TableRate\RuleSettingsConverter;
use WPDesk\FSPro\TableRate\RulesTableSettings;
use WPDesk\FSPro\TableRate\ShippingMethod\CalculatedCost;
use WPDesk\FSPro\TableRate\ShippingMethod\CalculationFunction;
use WPDesk\FSPro\TableRate\ShippingMethod\FreeShippingCalculatorCallback;
use WPDesk\FSPro\TableRate\ShippingMethod\ShippingContentsFilter;
use WPDesk\FSPro\TableRate\WeightCalculationSettings;

/**
 * Plugin.
 */
class WPDesk_Flexible_Shipping_Pro_Plugin extends AbstractPlugin implements HookableCollection {

	use HookableParent;
	use TemplateLoad;

	const HOOK_PRIORITY_AFTER_DEFAULT = 11;

	/**
	 * Logger.
	 *
	 * @var LoggerInterface
	 */
	private $logger;

	/**
	 * @var string
	 */
	private $flexible_shipping_plugin_version = '0.0';

	/**
	 * WPDesk_Flexible_Shipping_Pro_Plugin constructor.
	 *
	 * @param FSProVendor\WPDesk_Plugin_Info $plugin_info Plugin info.
	 */
	public function __construct( FSProVendor\WPDesk_Plugin_Info $plugin_info ) {
		$this->plugin_info = $plugin_info;
		parent::__construct( $this->plugin_info );
		$this->init_logger();
		$this->init_tracker();
	}

	/**
	 * .
	 *
	 * @return void
	 */
	private function init_tracker() {
		$this->add_hookable( TrackerInitializer::create_from_plugin_info( $this->plugin_info, new ShouldDisplayNever() ) );
	}

	/**
	 * Initialize $this->logger
	 */
	private function init_logger() {
		if ( class_exists( 'WPDesk_Flexible_Shipping_Logger_Settings' ) ) {
			$logger_settings = new WPDesk_Flexible_Shipping_Logger_Settings();
			if ( $logger_settings->is_enabled() ) {
				$this->logger = ( new WPDeskLoggerFactory() )->createWPDeskLogger( $logger_settings->get_logger_channel_name() );
			}
		}

		$this->logger = new NullLogger();
	}

	/**
	 * Hooks.
	 */
	public function hooks() {
		parent::hooks();

		$plugin_compatibility = new PluginCompatibility();
		$plugin_compatibility->hooks();

		$this->add_hookable( new ShippingExtensions( $this->plugin_info ) );

		$this->add_hookable( new \WPDesk\FSPro\TableRate\Rule\Condition\Product\AjaxHandler() );
		$this->add_hookable( new \WPDesk\FSPro\TableRate\Rule\Condition\ProductTag\AjaxHandler() );

		add_action( 'plugins_loaded', [ $this, 'init_flexible_shipping' ], self::HOOK_PRIORITY_AFTER_DEFAULT );

		add_action( 'flexible-shipping/core/initialized', [ $this, 'initialize_flexible_shipping_external_access' ] );

		$this->hooks_on_hookable_objects();
	}

	/**
	 * Init base variables for plugin
	 */
	public function init_base_variables() {
		$this->plugin_url = $this->plugin_info->get_plugin_url();

		$this->plugin_path   = $this->plugin_info->get_plugin_dir();
		$this->template_path = $this->plugin_info->get_text_domain();

		$this->plugin_text_domain = $this->plugin_info->get_text_domain();
		$this->plugin_namespace   = $this->plugin_info->get_text_domain();
	}

	/**
	 * @param ExternalPluginAccess $external_plugin_access .
	 */
	public function initialize_flexible_shipping_external_access( $external_plugin_access ) {
		$this->flexible_shipping_plugin_version = $external_plugin_access->get_plugin_version();
		$this->logger = $external_plugin_access->get_logger();
		if ( version_compare( $this->flexible_shipping_plugin_version, '4.5', '<' ) ) {
			add_action(
				'admin_init',
				function() {
					new Notice(
						sprintf(
						// Translators: plugins url.
							__( 'A new Flexible Shipping version introducing the helpful rules table hints and tooltips is available. %1$sUpdate now%2$s', 'flexible-shipping-pro' ),
							'<a href="' . esc_url( admin_url( 'plugins.php' ) ) . '">',
							'</a>'
						)
					);
				}
			);
		}
	}

	/**
	 * .
	 */
	public function init_flexible_shipping() {
		$fs = new WPDesk_Flexible_Shipping_Pro_FS_Hooks();

		$woocommerce_form_fields = new WPDesk_Flexible_Shipping_Pro_Woocommerce_Form_Field();
		$woocommerce_form_fields->hooks();

		if ( 'pl_PL' !== get_locale() ) {
			$beacon = new BeaconPro(
				'2321116f-e474-45a7-b04d-0950420ff894',
				new WPDesk_Flexible_Shipping_Pro_Plugin_Beacon_Should_Show_Strategy(),
				$this->get_plugin_url() . 'vendor_prefixed/wpdesk/wp-helpscout-beacon/assets/'
			);
			$beacon->hooks();
		}

		$rule_hooks = new RuleAdditionalCostHooks();
		$rule_hooks->hooks();

		if ( class_exists( 'WPDesk\FS\TableRate\Rule\Condition\AbstractCondition' ) ) {
			$categories_options = new CategoriesOptions();

			$rule_conditions = new RuleConditions( $categories_options );
			$rule_conditions->hooks();

			$rule_conditions = new AjaxHandler( $categories_options );
			$rule_conditions->hooks();
		}

		if ( class_exists( 'WPDesk\FS\TableRate\ImportExport\Conditions\AbstractExportData' ) ) {
			( new ExportData() )->hooks();
			( new ImportData() )->hooks();
		}

		$special_actions = new SpecialActions();
		$special_actions->hooks();

		$free_shipping_allowed = new FreeShippingNoticeAllowed();
		$free_shipping_allowed->hooks();

		$rule_settings_hooks = new RuleSettingsConverter();
		$rule_settings_hooks->hooks();

		$default_rule_settings = new DefaultRulesSettings();
		$default_rule_settings->hooks();

		$rules_table_settings = new RulesTableSettings();
		$rules_table_settings->hooks();

		$shipping_contents = new ShippingContentsFilter();
		$shipping_contents->hooks();

		( new WeightCalculationSettings() )->hooks();

		$calculation_function = new CalculationFunction();
		$calculation_function->hooks();

		$calculated_cost = new CalculatedCost();
		$calculated_cost->hooks();

		$free_shipping_calculator = new FreeShippingCalculatorCallback();
		$free_shipping_calculator->hooks();

		$predefined_scenarios = new PreconfiguredScenariosPro();
		$predefined_scenarios->hooks();
	}

	/**
	 * .
	 *
	 * @param mixed $links .
	 *
	 * @return array
	 */
	public function links_filter( $links ) {
		$docs_link    = get_locale() === 'pl_PL' ? 'https://octol.io/fs-docs-pl' : 'https://octol.io/fs-docs';
		$support_link = get_locale() === 'pl_PL' ? 'https://octol.io/fs-support-pl' : 'https://octol.io/fs-support';

		$plugin_links = [
			'<a href="' . admin_url( 'admin.php?page=wc-settings&tab=shipping&section=flexible_shipping_info' ) . '">' . __( 'Settings', 'flexible-shipping-pro' ) . '</a>',
			'<a target="_blank" href="' . $docs_link . '">' . __( 'Docs', 'flexible-shipping-pro' ) . '</a>',
			'<a target="_blank" href="' . $support_link . '">' . __( 'Support', 'flexible-shipping-pro' ) . '</a>',
		];

		return array_merge( $plugin_links, $links );
	}
}
