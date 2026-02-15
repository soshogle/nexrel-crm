<?php
/**
 * Class Cancel
 *
 * @package WPDesk\FSPro\TableRate\Rule\SpecialAction
 */

namespace WPDesk\FSPro\TableRate\Rule\SpecialAction;

use WPDesk\FS\TableRate\Rule\SpecialAction\AbstractSpecialAction;

/**
 * Cancel action.
 */
class Cancel extends AbstractSpecialAction {

	/**
	 * Cancel constructor.
	 */
	public function __construct() {
		if ( method_exists( AbstractSpecialAction::class, 'get_description' ) ) {
			parent::__construct(
				'cancel',
				__( 'Hide', 'flexible-shipping-pro' ),
				__( 'Hide this shipping method once the condition defined in this rule is met', 'flexible-shipping-pro' )
			);
		} else {
			parent::__construct( 'cancel', __( 'Hide', 'flexible-shipping-pro' ) );
		}
	}

	/**
	 * @return bool
	 */
	public function is_cancel() {
		return true;
	}

	/**
	 * @return bool
	 */
	public function is_stop() {
		return false;
	}

}
