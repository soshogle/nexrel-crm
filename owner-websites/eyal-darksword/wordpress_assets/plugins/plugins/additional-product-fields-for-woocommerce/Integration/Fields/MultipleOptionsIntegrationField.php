<?php


namespace rednaowooextraproduct\Integration\Fields;


class MultipleOptionsIntegrationField extends IntegrationFieldBase
{
    public function ToText()
    {
        $values=[];
        foreach($this->Entry->SelectedValues as $currentValue)
            $values[]=$currentValue->Value;

        return \implode(', ',$values);
    }

}