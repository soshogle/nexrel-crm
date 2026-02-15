<?php
/**
 * @license GPL-2.0-or-later
 *
 * Modified by James Kemp on 30-December-2025 using Strauss.
 * @see https://github.com/BrianHenryIE/strauss
 */ declare( strict_types=1 );

namespace Iconic_WooThumbs_NS\StellarWP\Uplink\Auth\Token;

use Iconic_WooThumbs_NS\StellarWP\Uplink\Auth\Authorizer;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Auth\Token\Contracts\Token_Manager;

final class Disconnector {

	/**
	 * @var Authorizer
	 */
	private $authorizer;

	/**
	 * @var Token_Manager
	 */
	private $token_manager;

	/**
	 * @param  Authorizer  $authorizer  Determines if the current user can perform actions.
	 * @param  Token_Manager  $token_manager The Token Manager.
	 */
	public function __construct(
		Authorizer $authorizer,
		Token_Manager $token_manager
	) {
		$this->authorizer    = $authorizer;
		$this->token_manager = $token_manager;
	}

	/**
	 * Delete a token if the current user is allowed to.
	 */
	public function disconnect(): bool {
		if ( ! $this->authorizer->can_auth() ) {
			return false;
		}

		return $this->token_manager->delete();
	}

}
