<?php
/**
 * Class SpecialActions
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FS\TableRate\Rule\SpecialAction\SpecialAction;
use WPDesk\FSPro\TableRate\Rule\SpecialAction\Cancel;
use WPDesk\FSPro\TableRate\Rule\SpecialAction\Stop;

/**
 * Can provide special actions.
 */
class SpecialActions implements Hookable {
	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_special_actions', array( $this, 'add_special_actions' ) );
	}

	/**
	 * @param SpecialAction[] $special_actions .
	 *
	 * @return SpecialAction[]
	 */
	public function add_special_actions( $special_actions ) {
		$cancel = new Cancel();
		$stop   = new Stop();

		$special_actions[ $cancel->get_special_action_id() ] = $cancel;
		$special_actions[ $stop->get_special_action_id() ]   = $stop;

		return $special_actions;
	}
}
