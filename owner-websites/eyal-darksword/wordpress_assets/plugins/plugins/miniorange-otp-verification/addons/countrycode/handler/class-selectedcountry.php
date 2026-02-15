<?php
/**
 * Handler functions for Country restriction addon
 *
 * @package miniorange-otp-verification/addons/countrycode/handler
 */

namespace OTP\Addons\CountryCode\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\BaseAddOnHandler;
use OTP\Traits\Instance;
use OTP\Helper\MoFormDocs;

/**
 * The class is used to handle all Selected Country addon related functionality.
 * <br/><br/>
 * This class hooks into all the available notification hooks and filters to
 * provide the possibility of restricting OTP verification to selected countries only.
 */
class SelectedCountry extends BaseAddOnHandler {

	use Instance;

	/**
	 * Constructor checks if add-on has been enabled by the admin and initializes
	 * all the class variables. This function also defines all the hooks to
	 * hook into to make the add-on functionality work.
	 */
	public function __construct() {
		parent::__construct();
		if ( ! $this->moAddOnV() ) {
			return;
		}
		SelectedCountryCode::instance();
	}

	/**
	 * Set a unique key for the AddOn
	 */
	public function set_addon_key() {
		$this->add_on_key = 'selected_country_addon';
	}

	/**
	 * Set description for the AddOn
	 */
	public function set_add_on_desc() {
		$this->add_on_desc = array(
			'Add countries for which you wish to enable OTP Verification',
			'Country code dropdown will be altered accordingly',
			'Block other countries',
		);
	}

	/**
	 * Set name for the AddOn
	 */
	public function set_add_on_name() {
		$this->addon_name = 'OTP Verification for Selected Countries Only';
	}

	/**
	 * Set settings URL for the AddOn
	 */
	public function set_settings_url() {
		$req_url            = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
		$this->settings_url = add_query_arg( array( 'addon' => 'selectedcountrycode' ), $req_url );
	}

	/**
	 * Set documentation URL for the AddOn
	 */
	public function set_add_on_docs() {
		$this->add_on_docs = MoFormDocs::SELECTED_COUNTRY_CODE_ADDON_LINK['guideLink'];
	}

	/**
	 * Set video URL for the AddOn
	 */
	public function set_add_on_video() {
		$this->add_on_video = MoFormDocs::SELECTED_COUNTRY_CODE_ADDON_LINK['videoLink'];
	}
}
