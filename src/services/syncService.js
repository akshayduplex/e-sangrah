import axios from 'axios';
import Project from '../models/Projects.js';

class SyncService {
    async fetchDataFromAPI() {
        try {
            const response = await axios.post(
                'https://hrmsapis.dtsmis.in/v1/dms/getProjectList',
                { page_no: "3", per_page_record: "10" },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.projectListToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.status && response.data.data) {
                return response.data.data;
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('Error fetching data from API:', error.message);
            throw new Error('Failed to fetch data from API');
        }
    }

    async syncData() {
        try {
            const apiData = await this.fetchDataFromAPI();
            const results = { added: 0, updated: 0, errors: 0 };

            for (const projectData of apiData) {
                try {
                    const projectToSave = {
                        project_id: projectData._id,
                        title: projectData.title,
                        manager_list: projectData.manager_list || [],
                        in_charge_list: projectData.in_charge_list || [],
                        start_date: projectData.start_date ? new Date(projectData.start_date) : null,
                        end_date: projectData.end_date ? new Date(projectData.end_date) : null,
                        duration: projectData.duration || '',
                        status: projectData.status || 'Active',
                        updated_on: new Date()
                    };

                    const existingProject = await Project.findOne({ project_id: projectData._id });

                    if (existingProject) {
                        await Project.findByIdAndUpdate(existingProject._id, projectToSave);
                        results.updated++;
                    } else {
                        await Project.create(projectToSave);
                        results.added++;
                    }
                } catch (error) {
                    console.error(`Error processing project ${projectData._id}:`, error.message);
                    results.errors++;
                }
            }

            return {
                success: true,
                message: `Sync completed: ${results.added} added, ${results.updated} updated, ${results.errors} errors`,
                results
            };
        } catch (error) {
            console.error('Error syncing data:', error.message);
            return { success: false, message: error.message };
        }
    }
}

export default SyncService;
