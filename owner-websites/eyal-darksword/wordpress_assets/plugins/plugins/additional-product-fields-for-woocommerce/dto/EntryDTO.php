<?php


namespace rednaowooextraproduct\dto;


class EntryDTO
{
    /** @var EntryFieldDTO[] */
    public $Fields;
    /** @var TotalsDTO */
    public $Totals;

}

class TotalsDTO{
    public $ProductPrice;
    public $OptionsTotal;
    public $GrandTotal;
    public $OptionsUnitPrice;
}

class EntryFieldDTO{
    public $Label;
    public $Id;
    public $Type;
    public $PriceType;
    public $Price;
    public $Quantity;
    public $Value;
}

class LineItemDTO{
    public $Label;
    public $Value;
    public $Quantity;
    public $UnitPrice;
    public $Price;
    public $Id;
    public $PriceType;
    public $Taxes;
    /** @var TaxesDTO[] */
    public $TotalTax;
}

class TaxesDTO{
    public $Name;
    public $Price;
}