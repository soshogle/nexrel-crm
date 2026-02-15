<?php


namespace rednaowooextraproduct\core\Managers;


use Error;
use Exception;
use PharIo\Manifest\Email;
use rednaowooextraproduct\core\Loader;
use rednaowooextraproduct\core\Managers\CartItemPrinter\CartItemPrinter;
use rednaowooextraproduct\core\Managers\EmailManager\EmailManager;
use rednaowooextraproduct\core\Managers\FileManager\FileManager;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\MetaGenerator\MetaGenerator;
use rednaowooextraproduct\core\Managers\OrderLineBuilder\OrderLineBuilder;
use rednaowooextraproduct\core\Managers\OrderLineUpdater\OrderLineUpdater;

use rednaowooextraproduct\core\Utils\ArrayUtils;
use rednaowooextraproduct\Integration\PluginsIntegration\PluginIntegrationManager;
use rednaowooextraproduct\Integration\PluginsIntegration\Plugins\IntegrationBase;
use rednaowooextraproduct\pr\Integration\Translations\ProductTranslations;
use rednaowooextraproduct\repository\ProductRepository;
use rednaowooextraproduct\Utilities\Sanitizer;
use WC_Order;
use WC_Order_Item_Product;
use WC_Product_Simple;
use WooCommerce;

class WooStagesManager
{
    /**
     * WooStagesManager constructor.
     * @param $loader Loader
     */

    /** @var Loader */
    public $Loader;
    public function __construct($loader)
    {
        $this->Loader=$loader;
        add_filter( 'woocommerce_get_item_data', array( $this, 'GetItemData' ), 50, 2 );
        //add_filter( 'woocommerce_order_item_meta_start', array( $this, 'PrintEmail' ), 50, 4 );
       // add_filter( 'wc_get_template', array( $this, 'GetCartTemplate' ), 10, 5 );
        add_filter( 'woocommerce_add_cart_item_data', array( $this, 'AddCartItemData' ),10,2 );
        add_action( 'woocommerce_before_cart_contents',array($this,'BeforeCartContent'));
        add_action( 'woocommerce_order_item_' . 'line_item' . '_html', array( $this, 'OrderLineItem' ), 10, 2 );
        add_action('woocommerce_before_cart_contents',array($this,'CartContent'));
        add_filter('woocommerce_order_item_get_formatted_meta_data',array($this,'MaybeFormatMeta'),10,2);
        add_filter('woocommerce_order_again_cart_item_data',array($this,'OrderAgain'),3,10);

        add_action( 'woocommerce_before_calculate_totals',array($this,'BeforeCartContent'));

        \add_action('woocommerce_thankyou',array($this,'OrderCreated'));
        add_filter( 'woocommerce_add_to_cart_validation', array($this,'AddToCartValidation'), 10, 4 );
        add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'AddMetaToOrder' ), 50, 4 );
        add_action('template_redirect',array($this,'WooCommerceLoaded'));
        add_filter( 'woocommerce_checkout_cart_item_quantity', array( $this, 'CartItemName' ), 10, 3 );
        add_action( 'woocommerce_saved_order_items', array( $this, 'UpdateOrderItem' ), 10, 2 );
        add_action( 'admin_enqueue_scripts', array( $this, 'RegisterAdminScript' ) );
        add_action( 'wp_ajax_woocommerce_tm_get_variations_array', array( $this, 'GetVariations' ) );

        //  add_action( 'woocommerce_cart_loaded_from_session',array($this,'LoadFromSession'));

    }


    /**
     * @param $array
     * @param $item WC_Order_Item_Product
     * @param $order
     * @return mixed
     */
    public function OrderAgain(&$array,$item,$order){

        $rnEntry=$item->get_meta('rn_entry');
        $rnOptions=$item->get_meta('rn_options');
        $rnLineItems=$item->get_meta('rn_line_items');

        if($rnEntry==''||$rnOptions==''||$rnLineItems=='')
            return $array;
        $array['rn_entry']=$rnEntry;
        $array['rn_options']=$rnOptions;
        $rnLineItems['rn_line_items']=$rnLineItems;

        return $array;
    }

    public function CartContent(){
        wp_enqueue_style('extraproductcartstyles',$this->Loader->URL.'styles/cart.css');
    }

    /**
     * @param $formattedMeta
     * @param $order WC_Order_Item_Product
     */
    public function MaybeFormatMeta($formattedMeta,$order){
        if(!($order instanceof WC_Order_Item_Product))
            return $formattedMeta;


        foreach($formattedMeta as $key=>$value)
        {
            if(strpos( $value->key, '_rnex' ) === 0 )
            {
                unset($formattedMeta[$key]);
            }
        }
        $entry=$order->get_meta('rn_entry',true);
        $options=$order->get_meta('rn_options',true);
        if(!is_object($entry)||!isset($entry->Fields))
            return $formattedMeta;


        $translations=[];
        if($this->Loader->IsPR())
        {
            $productTranslations=new ProductTranslations($this->Loader);
            $translations=$productTranslations->GetTranslationStrings($order->get_product_id());

        }

        $printer=new CartItemPrinter($entry->Fields,$options==''?null:$options,0,$translations);

        global $post_type;


        try{
            $data=$printer->GetItemData(false);

            foreach($data as $currentItem)
            {
                $item=ArrayUtils::Find($formattedMeta,function ($item)use($currentItem){return $item->key==$currentItem['key'];});
                if($item==null)
                {
                    $item=new \stdClass();
                    $formattedMeta[]=$item;
                }

                $item->key=$currentItem['key'];
                $item->value=$currentItem['value'];
                $item->display_key=isset($currentItem['display_key'])?$currentItem['display_key']: $currentItem['name'];
                $item->display_value=$currentItem['display'];
            }
        }catch (Exception $e)
        {
            return $formattedMeta;
        }

        /*

        if(is_array($lineItems))
        {
            foreach($lineItems as $currentItem)
            {
                if(!is_object($currentItem))
                    continue;
                if(!isset($currentItem->Id)||!isset($currentItem->Label)||!isset($currentItem->Value))
                    continue;

                $id=Sanitizer::SanitizeString($currentItem->Id);
                $label=Sanitizer::SanitizeString($currentItem->Label);
                $value=Sanitizer::SanitizeString($currentItem->Value);




            }
        }*/


        return $formattedMeta;
    }

    /**
     * @param $itemId
     * @param $item WC_Order_Item_Product
     * @param $order
     * @param $plainText
     */
    public function PrintEmail($itemId,$item,$order,$plainText)
    {
        $meta=$item->get_meta('rn_entry');
        $options=$order->get_meta('rn_options',true);
        if($meta==''||$meta==null||!isset($meta->Fields)||count($meta->Fields)==0)
            return;

        $printer=new CartItemPrinter($meta->Fields,$options==''?null:$options);
        $data=$printer->GetItemData();
        foreach($data as $item)
        {
            echo $item['display'];
        }
    }

    public function OrderCreated($orderId)
    {
        $order = wc_get_order( $orderId );
        foreach ( $order->get_items() as  $item_key => $item_values ) {

            if($item_values->get_meta('rn_entry')!=''){

                $count=\get_option('rednaowooextraproduct_order_count',0);
                $count++;
                \update_option('rednaowooextraproduct_order_count',$count);
                return;
            }
        }
    }

    public function GetVariations(){
        $variations = array();
        $attributes = array();
        if ( isset( $_POST['post_id'] ) ) {
            $repository=new ProductRepository();
            $variations=$repository->GetVariations(\strval($_POST['post_id'] ));

            \wp_send_json(array(
                'success'=>true,
                'result'=>$variations
            ));
            return;
        }

        \wp_send_json_error(array(
            'success'=>false,
            'errorMessage'=>'An error occurred, please try again'
        ));
        die();
    }

    public function RegisterAdminScript(){
        $screen = get_current_screen();
        if ( $screen!=null&&$screen->post_type=='shop_order'){
            $this->Loader->AddRNTranslator(array('InternalShared'));

            $this->Loader->AddScript('shared-core','js/dist/SharedCore_bundle.js',array('@RNTranslator','wp-element','regenerator-runtime'));
            $this->Loader->AddScript('dashboard','js/dist/OrderDashboard_bundle.js',array('@shared-core'));
            $this->Loader->AddStyle('dashboard','js/dist/OrderDashboard_bundle.css');
            $this->Loader->AddStyle('woo-extra-products-admin-style','styles/order.css');

            $dir=wp_get_upload_dir();
            $mapsBaseURL=$dir['baseurl'].'/rednaowooextraproduct/maps/';
            $this->Loader->LocalizeScript('RednaoDashboardVar','dashboard','',array(
                'MapsBaseUrl'=>$mapsBaseURL
            ));
        }



    }

    public function UpdateOrderItem( $order_id = 0, $items = array() ) {

        $orderLineUpdater=new OrderLineUpdater();
        $orderLineUpdater->Initialize($items);
        $orderLineUpdater->Execute();

    }

    public function AddMetaToOrder( $item, $cart_item_key, $values,$order ) {
        if ( isset( $values['rn_entry'] )&&isset($values['rn_line_items']) ) {
            $lineItems=$values['rn_line_items'];
            foreach($lineItems as $fieldItem)
            {
                \apply_filters('woo-extra-product-before-add-order-meta',$fieldItem);

                if($fieldItem->Type=='signature')
                {
                    $fileManager=new FileManager($this->Loader);
                    $oldPath=$fieldItem->Path;
                    $fieldItem->Path=$fileManager->MaybeMoveToPermanentPath($fieldItem->Path);
                    $fieldItem->Value='';
                    $entry=$values['rn_entry'];
                    $this->UpdateSignaturePath($oldPath,$fieldItem->Path,$entry->Fields);
                }
            }


            $item->add_meta_data( 'rn_entry', $values['rn_entry'] );
            if(isset( $values['rn_options']->Icons))
            {
                unset($values['rn_options']->Icons);
            }

            if(isset( $values['rn_options']->Styles))
            {
                unset($values['rn_options']->Styles);
            }

            if(isset( $values['rn_options']->DynamicFieldTypes))
            {
                unset($values['rn_options']->DynamicFieldTypes);
            }

            $this->OptimiseOptionsToSave($values['rn_options']);


            $metag=new MetaGenerator( $this->Loader,$values['rn_options']);
            $fields= $metag->Generate($values['rn_entry']->Fields);

            foreach($fields as $currentValue)
            {
                $item->add_meta_data($currentValue['key'],$currentValue['value'],false);
            }

            $item->add_meta_data('rn_options',$values['rn_options']);
            $item->add_meta_data( 'rn_line_items', $lineItems);

/*

            if(isset($values['rn_entry']->Fields))
            {
                $data = (new CartItemPrinter($values['rn_entry']->Fields, $values['rn_options']))->GetItemData();

                foreach ($data as $currentItem)
                {
                    $item->add_meta_data($currentItem['name'],$currentItem['value']);

                }
            }

*/



        }

        if(isset($values['product_id'])&&isset($values['rn_options'])&&isset($values['rn_entry']))
        {

            $repository=new ProductRepository();
            $emailing=$repository->GetServerOption($values['product_id'],'Emailing','');

            if($emailing!=null&&$emailing!='')
            {
                $product = wc_get_product( $values['product_id'] );
                $formBuilder=new FormBuilder($this->Loader,$values['rn_options'],$values['rn_entry'],$product);
                $formBuilder->Initialize();
                foreach($emailing->Emails as $email)
                {

                    $emailManager=new EmailManager();
                    $emailManager->Initialize($formBuilder,$email);
                    $emailManager->Send();
                }
            }
        }

    }


    /**
     * @param string $item_id
     * @param WC_Order_Item_Product $item wc
     */
    public function OrderLineItem($item_id = "", $item = array() ){
        $lineItems=$item->get_meta('rn_line_items');
        if($lineItems==''||count($lineItems)==0)
            return;

        global $thepostid;
        $order=\wc_get_order($item->get_order_id());
        $builder=new OrderLineBuilder();
        $builder->Initialize($order,$item,$lineItems);
        $builder->Execute();

    }

    public function WooCommerceLoaded(){

        add_filter( 'woocommerce_add_to_cart_validation', array($this,'AddToCartValidation'), 10, 4 );
        if(\function_exists('is_checkout')&&!\is_checkout())
            add_filter( 'woocommerce_cart_item_name', array( $this, 'CartItemName' ), 10, 3 );
    }

    public function CartItemName($title = "", $cart_item = array(), $cart_item_key = "" ){
        if(!isset($cart_item['rn_entry']))
            return $title;

        /** @var WC_Product_Simple $data */
        $data=$cart_item['data'];
        $link=$data->get_permalink($cart_item);

        $nonce=\wp_create_nonce('edit_'.$cart_item['key']);
        if(\strpos($link,'?')===false)
            $link.='?';
        else
            $link.='&';
        $link.='cart_item='.$cart_item['key'].'&nonce='.$nonce;

        $title= $title."<br/><a class='rn-edit-options' style=\"font-size: 12px; display: block;\" href=\"$link\">".__("Edit Options","rednaowooextraproduct")."</a>";
        return $title;


    }


    public function AddToCartValidation($valid, $product_id, $quantity,$variation =''){
        if(isset($_POST['RednaoSerializedFields']))
        {
            $data=\json_decode(\stripslashes($_POST['RednaoSerializedFields']));
            if($data==null)
                return true;
            if(isset($data->PreviousCartKey))
            {
                WC()->cart->remove_cart_item( $data->PreviousCartKey );
                unset( WC()->cart->removed_cart_contents[ $data->PreviousCartKey ] );

            }
            $options=\json_decode((new ProductRepository())->GetProductExtraOptions($product_id));
            $product=null;
            if($variation!='')
                $product=wc_get_product($variation);
            else
                $product = wc_get_product( $product_id );

            $form=new FormBuilder($this->Loader,$options,$data,$product);
            $form->Quantity=$quantity;
            $form->Initialize();

            if(\floatval($data->Totals->GrandTotal)==$form->GrandTotal&&
                $data->Totals->ProductPrice==$form->GetPrice()&&
                $data->Totals->OptionsUnitPrice==$form->OptionsUnitPrice&&
                $data->Totals->OptionsTotal==$form->OptionsTotal&&
                $form->CalculationsAreValid()
            )
                return true;
            else{
                //wc_add_notice( __( 'Invalid product price, please try again.', 'woocommerce' ), 'error' );
                //return false;

            }
        }
        return true;
    }

    public function BeforeCartContent($cart_object ){
        PluginIntegrationManager::Initialize($this->Loader);
        foreach ( WC()->cart->get_cart() as $key => $value ) {
            if(isset($value['rn_entry']))
            {
                $entry=$value['rn_entry'];
                if(isset($entry->Totals))
                {

                    /** @var WC_Product_Simple $cartItem */
                    $cartItem = $value['data'];
                    $cartItem->set_price($entry->Totals->ProductPrice+$entry->Totals->OptionsUnitPrice);

                    if($cartItem->is_on_sale())
                        $cartItem->set_sale_price($entry->Totals->ProductPrice+$entry->Totals->OptionsUnitPrice);
                    else
                        $cartItem->set_regular_price($entry->Totals->ProductPrice+$entry->Totals->OptionsUnitPrice);

                }


            }


        }
    }

    public function AddCartItemData($cart_item_meta, $product_id){
        if(isset($_POST['RednaoSerializedFields']))
        {
            $data=\json_decode(\stripslashes($_POST['RednaoSerializedFields']));
            if($data==null)
                return null;
            $options=\json_decode((new ProductRepository())->GetProductExtraOptions($product_id));
            unset($_POST['RednaoSerializedFields']);
            $product = wc_get_product( $product_id );
            $form=new FormBuilder($this->Loader,$options,$data,$product);
            $form->Initialize();
            $lineItems=$form->GenerateLineItems();

            if(isset($data->Totals)&&isset($data->Totals->GrandTotal))
                unset($data->Totals->GrandTotal);
            $cart_item_meta['rn_entry']=$data;
            $cart_item_meta['rn_options']=$options;
            $cart_item_meta['rn_line_items']=$lineItems;
        }

        return $cart_item_meta;
    }

    public function GetItemData( $other_data, $cart_item ) {

        if(isset($cart_item['rn_entry']))
        {

            $translations=[];
            if($this->Loader->IsPR())
            {
                $productTranslations=new ProductTranslations($this->Loader);
                $translations=$productTranslations->GetTranslationStrings($cart_item['product_id']);

            }
            $cart=new CartItemPrinter($cart_item['rn_entry']->Fields,$cart_item['rn_options'],0,$translations);
            $other_data=\array_merge($other_data, $cart->GetItemData(false));

        }

        if(is_array($other_data))
            for($i=0;$i<count($other_data);$i++)
            {
                if(isset($other_data[$i]['field'])&&!is_string($other_data[$i]['field']))
                    unset($other_data[$i]['field']);
            }
        return $other_data;

    }



    public function GetCartTemplate($located = "", $template_name = "", $args = "", $template_path = "", $default_path = "" ){
        $templates = array( 'cart/cart-item-data.php' );

        if ( in_array( $template_name, $templates ) ) {
            $located = wc_locate_template( $template_name, 'rn-advanced-product-options', $this->Loader->DIR.'templates/' );
            if ( file_exists( $located ) ) {
                $located = $located;
            }
        }

        return $located;
    }

    private function UpdateSignaturePath($oldPath, $newPath, $entry)
    {
        foreach($entry as $currentEntry)
        {
            if($currentEntry->Type=='signature'&&$currentEntry->Path==$oldPath)
            {
                $currentEntry->Path = $newPath;
                $currentEntry->Value='p';
            }


            if($currentEntry->Type=='grouppanel'||$currentEntry->Type=='collapsible'||$currentEntry->Type=='popup')
            {
                $this->UpdateSignaturePath($oldPath,$newPath,$currentEntry->Value);
            }

            if($currentEntry->Type=='repeater')
            {
                foreach($currentEntry->Value as $item)
                {
                    $this->UpdateSignaturePath($oldPath, $newPath,$item);
                }
            }
        }


    }

    private function OptimiseOptionsToSave($options)
    {
        if(!isset($options->Rows)&&!isset($options->RowTemplates))
            return;

        if(isset($options->RowTemplates))
            $rows=$options->RowTemplates;
        else
            $rows=$options->Rows;

        $fieldSettingsToRemove=['Options','Conditions','Formulas','Icon','IsFieldContainer','FieldActions','CustomCSS','Description','ShowDescriptionType','Tooltip','AdditionalOptionColumn','ShowOptionsPrice',
            'PriceType','Required','Price','SalePrice','HidePrice','ShowQuantitySelector','QuantityPosition','QuantityMinimumValue','QuantityMaximumValue','QuantityDefaultValue','QuantityPlaceholder','QuantityLabel',
            'SkipWhenPriceIsZero','FreeCharOrWords','Placeholder','Indicators','PricesPerRange'];
        foreach($rows as $currentRow)
        {
            if(!isset($currentRow->Columns))
                return;
            foreach($currentRow->Columns as $currentColumn)
            {
                if(!isset($currentColumn->Field))
                    return;

                $field=$currentColumn->Field;
                foreach($fieldSettingsToRemove as $currentSetting)
                {
                    if(isset($field->$currentSetting))
                        unset($field->$currentSetting);
                }

                if(isset($field->Rows)||isset($field->RowTemplates))
                    $this->OptimiseOptionsToSave($field);

            }
        }
    }


}