<?php 

class WC_Clickship_Shipping_Rates_Method extends WC_Shipping_Method{

	function isEmptyString($str){
    	return (!isset($str) || trim($str) === '');
	}
	
	function debug_to_console( $data, $print_text ) {
		$temp;

		if (is_array($data) || is_object($data)) {
			$temp = json_encode($data);
		} else {
			$temp = $data;
		}
		
		echo("<script>console.log('". $print_text . $temp ."');</script>");
	}
		
	function get_formatted_url( $url ) {
		$url = urldecode( $url );

		if ( ! strstr( $url, '://' ) ) {
			$url = 'https://' . $url;
		}

		// $this->debug_to_console($url, 'URL:- ');		

		return $url;
	}

	function getOriginAddress(){
		$origin = array();

		$originCountry = explode(':', get_option( 'woocommerce_default_country' ));

		$origin['name'] = get_option('woocommerce_email_from_name');
		$origin['company_name'] = get_option('woocommerce_email_from_name');
		
		$origin['address1'] = get_option( 'woocommerce_store_address' );
		$origin['address2'] = get_option( 'woocommerce_store_address_2' );
		$origin['city'] = get_option( 'woocommerce_store_city' );
		$origin['province'] = $originCountry['1'];
		$origin['country'] = $originCountry['0'];
		$origin['postal_code'] = get_option( 'woocommerce_store_postcode' );

		$origin['phone'] = '0000000000';
		$origin['email'] = get_option('woocommerce_email_from_address');

		// $this->debug_to_console($origin, 'Origin:- ');

		return $origin;
	}

	function getDestinationAddress($package){
		$desination = array();
		$current_user = wp_get_current_user();
  	 	$customer_meta = get_user_meta( $current_user->ID );

  	 	// $this->debug_to_console($current_user, 'Current User:- ');
  	 	// $this->debug_to_console($customer_meta, 'Customer meta:- ');

		if ( 1 == $current_user->ID ) {
			$desination['address1'] = $customer_meta['shipping_address_1'][0];
			$desination['address2'] = $customer_meta['shipping_address_2'][0];
			$desination['email'] = $customer_meta['billing_email'][0];
			$desination['phone'] = $customer_meta['billing_phone'][0];
			$desination['name'] = $customer_meta['shipping_first_name'][0] . ' ' . $customer_meta['shipping_last_name'][0];
			$desination['company_name'] = $customer_meta['shipping_company'][0];
		} else {
			$desination['email'] = 'info@clickship.com';
			$desination['phone'] = '0000000000';			
		}

		// $this->debug_to_console($package, 'Package:- ');

		$desination['city'] = $package['destination']['city'];
		$desination['province'] = $package['destination']['state'];
		$desination['country'] = $package['destination']['country'];
		$desination['postal_code'] = $package['destination']['postcode'];
				
		// $this->debug_to_console($desination, 'Destination:- ');

		return $desination;
	}

	function getItems($package = Array()){
		$items = array();

		foreach ( $package['contents'] as $key => $value ) {
			$item = array(
				'product_id' => $value ['product_id'],
				'quantity' => $value ['quantity']
			);
			
			array_push($items, $item);
		}

		// $this->debug_to_console($items, 'Items:- ');

		return $items;
	}
	
	function post_consumer_data( $consumer_data, $url ) {
		$params = array(
			'body'    => wp_json_encode( $consumer_data ),
			'timeout' => 60,
			'headers' => array(
				'Content-Type' => 'application/json;',
			),
		);

		return wp_safe_remote_post( esc_url_raw( $url ), $params );
	}
		
	public function __construct(){
		
		$this->id 		= 'clickship_shipping_rates';
		$this->method_title = __( 'ClickShip Shipping Rates settings', 'woocommerce' );
		$this->method_description = __( 'For ClickShip rates on your store checkout page, you have to enable and provide the markerplaceId then based on the destination location rates will display on checkout page. <br/><br/> <b>Don\'t have Marketplace Id, You can register <a href="https://info.clickship.com/">here</a> for markerplaceId.</b>' );
		
		// Load the settings.
		$this->init_form_fields();
		$this->init_settings();
		
		$this->clickship_url = 'https://app.clickship.com/clickship/api/shipments/getRates/';
		$this->marketplace_id = $this->get_option( 'marketplace_id' );
		$this->clickship_enable = $this->get_option( 'clickship_enable' );
				
		add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
	}
			
	public function init_form_fields(){
  		$this->form_fields = array(
			'clickship_enable' => array(
				'type'    		=> 'checkbox',
				'default'		=> 'yes',
				'title' 		=> __( 'Enable/Disable', 'woocommerce' ),
				'label' 		=> __( 'Show ClickShip Shipping rates', 'woocommerce' ),
				'description'	=> __( 'Shows ClickShip shipping rates only if this enabled.', 'woocommerce' )
			),
		    'marketplace_id' => array(
				'type'			=> 'text',
				'title'			=> __( 'Marketplace ID', 'woocommerce' ),
				'description' 	=> __( 'Provided ClickShip Marketplace id for validation', 'woocommerce' )
		    )
			//'clickship_url' => array(
			//	'type'			=> 'text',
			//	'title'			=> __( 'ClickShip Rest Service', 'woocommerce' ),
			//	'description' 	=> __( 'Clickship Get Shipping Rates Rest Service Endpoint', 'woocommerce' )
		    //)
		);	
  	}
		
	public function calculate_shipping($package = Array()){
	
		if ( $this->clickship_enable == 'no' ) {
			
			// $messageType = "error";
			// $message = sprintf( __( 'Disabled fetch Clickship rates feature, Please contact support team', 'woocommerce' ));
			// wc_add_notice( $message, $messageType );

		} elseif ( $this->isEmptyString($this->marketplace_id) ) {
			
			// $messageType = "error";
			// $message = sprintf( __( 'Invalid Clickship Shipping settings to get shipping rates.', 'woocommerce' ));
			// wc_add_notice( $message, $messageType );

		} else {
			
			$url = $this->get_formatted_url($this->clickship_url.$this->marketplace_id);
		
			$input_data = array();
			
			$input_data['items'] = $this->getItems($package);
			$input_data['origin'] = $this->getOriginAddress();
			$input_data['destination'] = $this->getDestinationAddress($package);
		
			$response = $this->post_consumer_data( $input_data, $url );
			$this->process_clickship_service_response($response);
		}
	}
	
	function process_clickship_service_response( $json_response ) {

		//$this->debug_to_console($json_response, 'JSON Response:- ');

		if( array_key_exists('errors', $json_response) ){
			// $messageType = "error";
			// $message = sprintf( __( 'Looks like server is down, unable to fetch Clickship rates.  Please contact support team', 'woocommerce' ));
			// wc_add_notice( $message, $messageType );			
		} elseif ( 200 == intval( $json_response['response']['code'] ) ) {
			$response = json_decode( $json_response['body'], true );
			
			foreach ($response['data'] as $key => $value) {
				$metadata = array(
					'cs_service_code' => $value ['service_code'],
					'cs_service_name' => $value ['service_name']
				);

				$rate = array(
					'id' 	=> $value ['service_code'],
					'label' => $value ['service_name'],
					'cost' 	=> $value ['total_price'].' '.$value ['currency'],
					'meta_data' => $metadata
				);
				
				$this->add_rate($rate);
			}
		} elseif ( 401 == intval( $json_response['response']['code'] ) ) {
			// $messageType = "error";
			// $message = sprintf( __( 'Unable to fetch shipping rates, Invalid marketplace_id. Please contact support team', 'woocommerce' ));
			// wc_add_notice( $message, $messageType );
		} else {
			// $messageType = "error";
			// $message = sprintf( __( 'Unknown error while fetching shipping rates, Please contact support team', 'woocommerce' ));
			// wc_add_notice( $message, $messageType );
		}
	}
}
?>