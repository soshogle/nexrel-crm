<?php


use rednaowooextraproduct\core\Managers\CartItemPrinter\CartItemPrinter;
use rednaowooextraproduct\Integration\Fields\IntegrationField;
use rednaowooextraproduct\Integration\Fields\IntegrationFieldCollection;
use rednaowooextraproduct\Integration\Fields\IntegrationFieldFactory;

class RNEPO
{
    /**
     * @param $orderId
     * @return IntegrationFieldCollection
     */
    public static function GetFieldsByOrder($orderId)
    {
        $order=wc_get_order($orderId);
        if($order==null)
            return null;

        $items=$order->get_items();

        $fieldItems=new IntegrationFieldCollection();
        foreach($items as $currentItem)
        {
            if($currentItem->get_meta('rn_line_items')==false)
                continue;

            $lineItem=$currentItem->get_meta('rn_line_items');
            if($lineItem!=null)
            {
                foreach($lineItem as $currentEntry)
                {
                    $fieldItems->AddField(IntegrationFieldFactory::CreateField($order,$currentItem,$currentEntry));
                }
            }


        }

        return $fieldItems;


    }

    public static function GetFieldsByItemId($orderId,$itemId)
    {
        $order=wc_get_order($orderId);
        if($order==null)
            return null;

        $item=$order->get_item($itemId);

        if($item==null)
            return null;

        $entryItems= $item->get_meta('rn_line_items');
        if($entryItems==null)
            return null;

        return IntegrationFieldFactory::CreateField($order,$item,$entryItems);
    }

    public static function GetFormattedData($OrderId,$itemId)
    {


        $order=new WC_Order($OrderId);
        if($order==false)
            return '';

        $item=$order->get_item($itemId);


        $entry=$item->get_meta('rn_entry',true);
        if(!is_object($entry)||!isset($entry->Fields))
            return '';

        $printer=new CartItemPrinter($entry->Fields);

        try{
            $data=$printer->GetItemData(false);
            $html='';
            foreach($data as $currentItem)
            {
                $html.='<p>';
                $html.='<strong>'.esc_html($currentItem['name']).':</strong>'.$currentItem['display'];
                $html.='</p>';
            }
        }catch (Exception $e)
        {
            return '';
        }

        return $html;
    }

    public static function GetFieldByName($orderId,$fieldName,$lineItemId='')
    {
        $order=wc_get_order($orderId);
        if($order==null)
            return null;

        $items=$order->get_items();
        foreach($items as $currentItem)
        {
            $lineItem=$currentItem->get_meta('rn_line_items');
            if($lineItem!=null)
            {
                foreach($lineItem as $currentEntry)
                {
                    if(isset($currentEntry->FieldName)&&$currentEntry->FieldName==$fieldName)
                        return IntegrationFieldFactory::CreateField($order,$currentItem,$currentEntry);
                }
            }
        }

        return null;

    }



}