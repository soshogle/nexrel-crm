<?php


namespace rednaowooextraproduct\Integration\Fields;


use Iterator;

class IntegrationFieldCollection implements Iterator
{
    /** @var IntegrationFieldBase[] */
    public $Fields;
    private $index = 0;


    public function __construct()
    {
        $this->Fields=[];
        $this->index=0;
    }

    public function AddField($field)
    {
        if($field==null)
            return;
        $this->Fields[]=$field;
    }

    /**
     * @return IntegrationFieldBase
     */
    public function current()
    {
        return $this->Fields[$this->index];
    }

    public function next()
    {
        $this->index ++;
    }

    public function key()
    {
        return $this->index;
    }

    public function valid()
    {
        return isset($this->Fields[$this->key()]);
    }

    public function rewind()
    {
        $this->index = 0;
    }

    public function reverse()
    {
        $this->Fields = array_reverse($this->Fields);
        $this->rewind();
    }
}