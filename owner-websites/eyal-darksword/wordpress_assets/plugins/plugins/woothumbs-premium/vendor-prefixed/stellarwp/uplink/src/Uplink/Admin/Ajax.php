<?php
/**
 * @license GPL-2.0-or-later
 *
 * Modified by James Kemp on 30-December-2025 using Strauss.
 * @see https://github.com/BrianHenryIE/strauss
 */ declare( strict_types=1 );

namespace Iconic_WooThumbs_NS\StellarWP\Uplink\Admin;

use Iconic_WooThumbs_NS\StellarWP\ContainerContract\ContainerInterface;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Config;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Resources\Collection;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Utils;

class Ajax {

	/**
	 * @var ContainerInterface
	 */
	protected $container;

	public function __construct() {
		$this->container = Config::get_container();
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function validate_license(): void {
		$submission = [
			'_wpnonce' => sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) ),
			'slug'     => sanitize_text_field( wp_unslash( $_POST['slug'] ?? '' ) ),
			'key'      => Utils\Sanitize::key( wp_unslash( $_POST['key'] ?? '' ) ),
		];

		if ( empty( $submission['key'] ) || ! wp_verify_nonce( $submission['_wpnonce'], $this->container->get( License_Field::class )->get_group_name() ) ) {
			wp_send_json_error( [
				'status'  => 0,
				'message' => __( 'Invalid request: nonce field is expired. Please try again.', 'iconic-woothumbs' ),
			] );
		}

		$collection = $this->container->get( Collection::class );
		$plugin     = $collection->offsetGet( $submission['slug'] );

		if ( ! $plugin ) {
			wp_send_json_error( [
				'message'    => sprintf(
					__( 'Error: The plugin with slug "%s" was not found. It is impossible to validate the license key, please contact the plugin author.', 'iconic-woothumbs' ),
					$submission['slug']
				),
				'submission' => $submission,
			] );
		}

		$results = $plugin->validate_license( $submission['key'] );
		$message = is_plugin_active_for_network( $plugin->get_path() ) ? $results->get_network_message()->get() : $results->get_message()->get();

		wp_send_json( [
			'status'  => absint( $results->is_valid() ),
			'message' => $message,
		] );
	}

}
