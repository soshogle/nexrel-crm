<?php


namespace rednaowooextraproduct\core\Managers\OrderLineUpdater;


use rednaowooextraproduct\dto\LineItemDTO;
use WC_Order;

class OrderLineUpdater
{
    public $Item;
    /** @var LineItemDTO */
    public $OldLineItems;
    public $RNLineItem;
    /** @var WC_Order */
    public $Order;


    public function Initialize(array $item)
    {
        $this->Item=$item;
        $this->RNLineItem=array();
        $usedIds=array();
        $this->Order=$this->GetOrder();

        if(isset($this->Item['rnfields']))
            $this->RNLineItem=$this->Item['rnfields'];

        foreach($this->RNLineItem as &$item)
            $item=\json_decode(\stripslashes($item));

    }

    public function Execute()
    {
        foreach($this->Item['order_item_id'] as $lineItemId)
        {

            $lineMeta=\wc_get_order_item_meta($lineItemId,'',false);
            if(!isset($lineMeta['rn_line_items'])||count($lineMeta['rn_line_items'])==0)
                continue;

            $oldLineItems=unserialize($lineMeta['rn_line_items'][0]);
            $oldTotals=$this->CalculateTotal($oldLineItems);


            $newLineItems=array();
            $newLineItems=array();
            if(isset($this->RNLineItem[$lineItemId]))
            {
                $newLineItems=$this->RNLineItem[$lineItemId];
            }

            $newTotal=$this->CalculateTotal($newLineItems);



            $lineTotal=floatval( $lineMeta['_line_total'][0])-$oldTotals+$newTotal;
            $ineSubTotal=floatval( $lineMeta['_line_subtotal'][0])-$oldTotals+$newTotal;

            wc_update_order_item_meta( $lineItemId, '_line_total', wc_format_decimal( $lineTotal ) );
            wc_update_order_item_meta( $lineItemId, '_line_subtotal', wc_format_decimal( $ineSubTotal ) );


            if(count($newLineItems)==0)
                wc_delete_order_item_meta( $lineItemId, 'rn_line_items');
            else
                wc_update_order_item_meta( $lineItemId, 'rn_line_items', $newLineItems );
            wp_cache_delete( $lineItemId, 'order_item_meta' );

            $this->Order=$this->GetOrder();
            $this->Order->calculate_totals();


        }


    }

    private function GetOrder()
    {
        global $thepostid, $theorder;

        if ( ! is_object( $theorder ) ) {
            $theorder = wc_get_order( $thepostid );
        }
        if ( ! $theorder && isset( $_POST['order_id'] ) ) {
            $order_id = absint( $_POST['order_id'] );
            $order    = wc_get_order( $order_id );

            return $order;
        } elseif ( ! $theorder && isset( $_POST['post_ID'] ) ) {
            $order_id = absint( $_POST['post_ID'] );
            $order    = wc_get_order( $order_id );

            return $order;
        }
        if ( ! $theorder ) {
            global $post;
            if ( $post ) {
                $theorder = wc_get_order( $post->ID );
            }
        }

        return $theorder;
    }

    private function CalculateTotal($oldLineItems)
    {
        $total=0;
        foreach($oldLineItems as $currentItem)
        {
            if($currentItem->Type=='repeater')
            {
                foreach ($currentItem->Value as $repeaterItem)
                {
                    $total += $this->CalculateTotal($repeaterItem);
                }
            }else {
                if(isset($currentItem->Price))
                    $total += \floatval($currentItem->Price);
            }
        }
        return $total;
    }
}

class LineToUpdateDTO{

}