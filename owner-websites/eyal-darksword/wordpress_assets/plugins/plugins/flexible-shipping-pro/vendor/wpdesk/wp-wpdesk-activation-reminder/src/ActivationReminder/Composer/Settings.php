<?php

namespace WPDesk\ActivationReminder\Composer;

class Settings {

	const PLUGIN_TITLE = 'plugin-title';
	const PLUGIN_DIR = 'plugin-dir';
	const LOGO_URL = 'logo-url';
	const BUY_PLUGIN_URL = 'buy-plugin-url';
	const ACTIVATION_REMINDER = 'activation-reminder';
	const HOW_TO_ACTIVATE_LINK = 'how-to-activate-link';

	/**
	 * @var string
	 */
	private $plugin_title;

	/**
	 * @var string
	 */
	private $plugin_dir;

	/**
	 * @var string
	 */
	private $logo_url;

	/**
	 * @var string
	 */
	private $buy_plugin_url;

	/**
	 * @var string
	 */
	private $how_to_activate_link;

	/**
	 * @param string $plugin_title
	 * @param string $plugin_dir
	 * @param string $logo_url
	 * @param string $buy_plugin_url
	 * @param string $how_to_activate_link
	 */
	public function __construct( string $plugin_title, string $plugin_dir, string $logo_url, string $buy_plugin_url, string $how_to_activate_link ) {
		$this->plugin_title         = $plugin_title;
		$this->plugin_dir           = $plugin_dir;
		$this->logo_url             = $logo_url;
		$this->buy_plugin_url       = $buy_plugin_url;
		$this->how_to_activate_link = $how_to_activate_link;
	}

	/**
	 * @return string
	 */
	public function get_plugin_title(): string {
		return $this->plugin_title;
	}

	/**
	 * @return string
	 */
	public function get_plugin_dir(): string {
		return $this->plugin_dir;
	}

	/**
	 * @return string
	 */
	public function get_logo_url(): string {
		return $this->logo_url;
	}

	/**
	 * @return string
	 */
	public function get_buy_plugin_url(): string {
		return $this->buy_plugin_url;
	}

	/**
	 * @return string
	 */
	public function get_how_to_activate_link(): string {
		return $this->how_to_activate_link;
	}

	/**
	 *
	 */
	public static function validate_settings( $settings ) {
		if ( ! isset( $settings[ self::ACTIVATION_REMINDER ] ) ) {
			throw new InvalidSettingValue( self::ACTIVATION_REMINDER, null );
		}
		if ( ! is_array( $settings[ self::ACTIVATION_REMINDER ] ) ) {
			throw new InvalidSettingValue( self::ACTIVATION_REMINDER, 'should be array' );
		}
		$settings_fields = [
			self::PLUGIN_TITLE,
			self::PLUGIN_DIR,
			self::LOGO_URL,
			self::BUY_PLUGIN_URL,
			self::HOW_TO_ACTIVATE_LINK,
		];
		foreach ( $settings_fields as $field ) {
			if ( ! isset( $settings[ self::ACTIVATION_REMINDER ][ $field ] ) ) {
				throw new InvalidSettingValue( $field, null );
			}
		}
	}


	/**
	 * @param array $settings
	 *
	 * @return self
	 */
	public static function create_from_composer_settings( array $settings ) {
		self::validate_settings( $settings );
		return new self(
			$settings[ self::ACTIVATION_REMINDER ][ self::PLUGIN_TITLE ],
			$settings[ self::ACTIVATION_REMINDER ][ self::PLUGIN_DIR ],
			$settings[ self::ACTIVATION_REMINDER ][ self::LOGO_URL ],
			$settings[ self::ACTIVATION_REMINDER ][ self::BUY_PLUGIN_URL ],
			$settings[ self::ACTIVATION_REMINDER ][ self::HOW_TO_ACTIVATE_LINK ]
		);
	}

}