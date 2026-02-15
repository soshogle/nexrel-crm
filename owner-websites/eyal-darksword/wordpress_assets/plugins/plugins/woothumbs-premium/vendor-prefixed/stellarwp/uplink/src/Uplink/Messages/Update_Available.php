<?php
/**
 * @license GPL-2.0-or-later
 *
 * Modified by James Kemp on 30-December-2025 using Strauss.
 * @see https://github.com/BrianHenryIE/strauss
 */

namespace Iconic_WooThumbs_NS\StellarWP\Uplink\Messages;

use Iconic_WooThumbs_NS\StellarWP\ContainerContract\ContainerInterface;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Resources\Resource;

class Update_Available extends Message_Abstract {
	/**
	 * Resource instance.
	 *
	 * @var Resource
	 */
	protected $resource;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 *
	 * @param Resource $resource Resource instance.
	 * @param ContainerInterface|null $container Container instance.
	 */
	public function __construct( Resource $resource, $container = null ) {
		parent::__construct( $container );

		$this->resource = $resource;
	}

	/**
	 * @inheritDoc
	 */
	public function get(): string {
		$link = sprintf( '<a href="%s">', $this->resource->get_home_url() ?: '' );

		return sprintf(
			esc_html__( 'There is an update for %s. You\'ll need to %scheck your license%s to have access to updates, downloads, and support.', 'iconic-woothumbs' ),
			$this->resource->get_name(),
			$link,
			'</a>'
		);
	}
}
