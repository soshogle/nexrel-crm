<?php
/**
 * Class Stop
 *
 * @package WPDesk\FSPro\TableRate\Rule\SpecialAction
 */

namespace WPDesk\FSPro\TableRate\Rule\SpecialAction;

use WPDesk\FS\TableRate\Rule\SpecialAction\AbstractSpecialAction;

/**
 * Stop action.
 */
class Stop extends AbstractSpecialAction {

	/**
	 * Cancel constructor.
	 */
	public function __construct() {
		if ( method_exists( AbstractSpecialAction::class, 'get_description' ) ) {
			parent::__construct(
				'stop',
				__( 'Stop', 'flexible-shipping-pro' ),
				__( 'Stop calculating the following rules once the condition defined in this one is met', 'flexible-shipping-pro' )
			);
		} else {
			parent::__construct( 'stop', __( 'Stop', 'flexible-shipping-pro' ) );
		}
	}

	/**
	 * @return bool
	 */
	public function is_cancel() {
		return false;
	}

	/**
	 * @return bool
	 */
	public function is_stop() {
		return true;
	}

}
