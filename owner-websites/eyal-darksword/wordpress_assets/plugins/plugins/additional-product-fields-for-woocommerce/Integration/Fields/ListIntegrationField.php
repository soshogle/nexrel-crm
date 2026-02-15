<?php


namespace rednaowooextraproduct\Integration\Fields;


class ListIntegrationField extends IntegrationFieldBase
{
    public function ToText()
    {
        $values=[];
        foreach($this->Entry->Value as $currentRow)
            foreach($currentRow as $currentValue)
                $values[]=$currentValue;


        return implode(', ',$values);
    }
}