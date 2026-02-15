<?php
/**
 * @license GPL-2.0-or-later
 *
 * Modified by James Kemp on 30-December-2025 using Strauss.
 * @see https://github.com/BrianHenryIE/strauss
 */

namespace Iconic_WooThumbs_NS\StellarWP\Uplink\Messages;

use Iconic_WooThumbs_NS\StellarWP\ContainerContract\ContainerInterface;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Resources\Plugin;

class Update_Now extends Message_Abstract {
	/**
	 * Resource instance.
	 *
	 * @var Plugin
	 */
	protected $resource;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 *
	 * @param Plugin $resource Resource instance.
	 * @param ContainerInterface|null $container Container instance.
	 */
	public function __construct( Plugin $resource, $container = null ) {
		parent::__construct( $container );

		$this->resource = $resource;
	}

	/**
	 * @inheritDoc
	 */
	public function get(): string {
		// A plugin update is available
		$update_now = sprintf(
			esc_html__( 'Update now to version %s.', 'iconic-woothumbs' ),
			$this->resource->get_update_status()->update->version
		);

		$update_now_link = sprintf(
			' <a href="%1$s" class="update-link">%2$s</a>',
			wp_nonce_url( self_admin_url( 'update.php?action=upgrade-plugin&plugin=' ) . $this->resource->get_path(), 'upgrade-plugin_' . $this->resource->get_path() ),
			$update_now
		);

		$update_message = sprintf(
			esc_html__( 'There is a new version of %1$s available. %2$s', 'iconic-woothumbs' ),
			$this->resource->get_name(),
			$update_now_link
		);

		$message = sprintf(
			'<p>%s</p>',
			$update_message
		);

		return $message;
	}
}
