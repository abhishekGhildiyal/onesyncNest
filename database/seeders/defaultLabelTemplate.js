const { StoreModel, LabelModel, Template } = require('../databaseModels');

const defaultLabelTemplate = async () => {
    try {
        const stores = await StoreModel.findAll({
            attributes: ['store_id', 'productTemplate', 'productLabel', 'inventoryTemplate', 'inventoryLabel'],
            raw: true,
        });

        const labelsPayload = stores.flatMap((store) => {
            const payload = [];

            if (store.productTemplate && store.productLabel) {
                payload.push({
                    store_id: store.store_id,
                    label_name: 'Default Label product',
                    template_type: 'product',
                    label_template: store.productTemplate,
                    label_dimension: store.productLabel,
                });
            }

            if (store.inventoryTemplate && store.inventoryLabel) {
                payload.push({
                    store_id: store.store_id,
                    label_name: 'Default Label inventory',
                    template_type: 'inventory',
                    label_template: store.inventoryTemplate,
                    label_dimension: store.inventoryLabel,
                });
            }

            return payload;
        });

        if (!labelsPayload.length) return console.log('⚠ No templates found in store table.');

        const created = await LabelModel.bulkCreate(labelsPayload, {
            ignoreDuplicates: true,
            validate: true,
        });

        console.log(`✔ Labels generated for ${labelsPayload.length} entries across ${stores.length} stores`);

        // ---------------------- Add Template Linking --------------------------
        const labelMap = {};
        created.forEach((lbl) => {
            if (!labelMap[lbl.store_id]) labelMap[lbl.store_id] = {};
            labelMap[lbl.store_id][lbl.template_type] = lbl.id;
        });

        // Update template table for each store
        for (const storeId in labelMap) {
            await Template.update(
                {
                    display_label_id: labelMap[storeId]?.product || null,
                    item_label_id: labelMap[storeId]?.inventory || null,
                },
                { where: { storeId } }
            );
        }

        console.log(`✔ Templates successfully linked to store labels.`);
    } catch (err) {
        console.error('❌ Error running label seeder:', err);
    }
};

defaultLabelTemplate();
